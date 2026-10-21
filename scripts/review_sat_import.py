"""Review and export private candidates without any database access.

  python scripts/review_sat_import.py sheets --tests 5 --section rw --limit 12
  python scripts/review_sat_import.py approve --decisions artifacts/private-sat/decisions.json
  python scripts/review_sat_import.py export --owner <UUID>

Each decision must identify candidateId and its current digest, give reviewer and
evidence, and explicitly confirm visual, answer, explanation, taxonomy, difficulty,
edition, and accessibility checks. Optional document/key objects amend the extracted
candidate before approval. Decisions are attestations made after actual inspection;
neither the parser nor this script can infer that inspection occurred.
"""
from __future__ import annotations

import argparse
import copy
from datetime import datetime, timezone
from fractions import Fraction
import html
import json
from pathlib import Path
import re
import uuid

from import_sat_pdfs import DEFAULT_OUTPUT, DOMAINS, canonical_json, content_digest, coverage, private_output, sha256, write_json

CHECKS = {"visual", "answer", "explanation", "taxonomy", "difficulty", "edition", "accessibility"}


def candidates_at(root: Path) -> list[tuple[Path, list[dict]]]:
    return [(path, json.loads(path.read_text(encoding="utf-8"))) for path in sorted(root.glob("test-*.candidates.json"))]


def local_asset(root: Path, reference: str) -> Path:
    path = (root / reference).resolve()
    if not path.is_relative_to(root.resolve()) or not path.is_file():
        raise ValueError(f"Missing/unsafe private asset: {reference}")
    return path


def validate_blocks(blocks: list, root: Path | None = None) -> None:
    if not isinstance(blocks, list):
        raise ValueError("Blocks must be a list")
    ids = set()
    for block in blocks:
        if not isinstance(block, dict) or not block.get("id") or block["id"] in ids:
            raise ValueError("Each block requires a unique id")
        ids.add(block["id"])
        kind = block.get("type")
        if kind == "text" and isinstance(block.get("text"), str) and block["text"].strip():
            if "\ufffd" in block["text"] or "(cid:" in block["text"]:
                raise ValueError("Unmapped text glyphs require correction before approval")
        elif kind == "math" and isinstance(block.get("latex"), str) and block["latex"].strip():
            pass
        elif kind == "image" and isinstance(block.get("alt"), str) and block["alt"].strip():
            if root:
                local_asset(root, block["src"])
        elif kind == "table" and isinstance(block.get("headers"), list) and isinstance(block.get("rows"), list):
            if not block["headers"] or any(len(row) != len(block["headers"]) for row in block["rows"]):
                raise ValueError("Table rows must match headers")
        else:
            raise ValueError(f"Invalid or empty block: {kind}")


def validate_candidate(candidate: dict, root: Path | None = None) -> None:
    document, key = candidate["document"], candidate["key"]
    uuid.UUID(document["id"])
    section = document["section"]
    if section not in DOMAINS or document.get("domain") not in DOMAINS[section]:
        raise ValueError("Domain does not belong to section")
    if document.get("difficulty") not in {"easy", "medium", "hard"}:
        raise ValueError("Invalid editorial difficulty")
    if not document.get("skillId") or document["skillId"].endswith("-review"):
        raise ValueError("Replace provisional skill with a reviewed skill id")
    if not isinstance(document.get("version"), int) or document["version"] < 1:
        raise ValueError("Question version must be a positive integer")
    if not document.get("content"):
        raise ValueError("Question content is required")
    validate_blocks(document["passage"], root)
    validate_blocks(document["content"], root)
    accepted = key.get("accepted")
    if not isinstance(accepted, list) or not accepted or not all(isinstance(value, str) and value for value in accepted):
        raise ValueError("An explicit answer key is required")
    if not isinstance(key.get("explanation"), str) or not key["explanation"].strip():
        raise ValueError("Reviewed explanation is required")
    if document["format"] == "multiple-choice":
        options = document["options"]
        ids = [option["id"] for option in options]
        if len(options) != 4 or len(set(ids)) != 4 or len(accepted) != 1 or accepted[0] not in ids:
            raise ValueError("Multiple choice requires four distinct options and one matching key")
        for option in options:
            if not option.get("label") or not option.get("content"):
                raise ValueError("Missing option content/label")
            validate_blocks(option["content"], root)
    elif document["format"] == "numeric":
        if section != "math" or document["options"]:
            raise ValueError("Numeric response is only valid for Math without options")
        for value in accepted:
            if not re.fullmatch(r"-?(?:\d+(?:\.\d*)?|\.\d+|\d+/\d+)", value):
                raise ValueError(f"Invalid numeric answer: {value}")
            if len(value) > (6 if value.startswith("-") else 5):
                raise ValueError(f"Numeric answer exceeds SAT entry length: {value}")
            try:
                Fraction(value)
            except (ValueError, ZeroDivisionError) as error:
                raise ValueError(f"Invalid numeric answer: {value}") from error
    else:
        raise ValueError("Unknown question format")


def approve_candidate(candidate: dict, decision: dict, root: Path | None = None) -> dict:
    if decision.get("digest") != content_digest(candidate):
        raise ValueError(f"Stale review digest: {candidate['candidateId']}")
    if not all(decision.get("checks", {}).get(check) is True for check in CHECKS):
        raise ValueError("Every visual/content/key/edition review check must explicitly pass")
    if not str(decision.get("reviewer", "")).strip() or not str(decision.get("evidence", "")).strip():
        raise ValueError("Reviewer identity and inspection evidence are required")
    updated = copy.deepcopy(candidate)
    if "document" in decision:
        forbidden = {"id", "version", "provenance"} & decision["document"].keys()
        if forbidden:
            raise ValueError("A review amendment cannot change identity/version/provenance")
        updated["document"].update(decision["document"])
    if "key" in decision:
        updated["key"].update(decision["key"])
    if decision.get("answerVerification") == "independent-solution":
        if not decision.get("key", {}).get("accepted") or not decision.get("key", {}).get("explanation"):
            raise ValueError("Independent verification requires explicit answers and a worked explanation")
        # A scoring PDF with the same test number can belong to a different edition.
        # Bind independently checked answers to the actual source item instead.
        updated["supersededAnswerSource"] = updated.get("answerSource")
        updated["answerSource"] = {name: updated["source"][name] for name in ("path", "sha256", "page")}
        updated["answerSource"]["kind"] = "independent-solution-of-source-item"
    validate_candidate(updated, root)
    if root:
        local_asset(root, candidate["reviewAsset"] or "missing-review-asset")
        for source in (updated["source"], updated.get("answerSource")):
            if not source or sha256(Path(source["path"])) != source["sha256"]:
                raise ValueError("Source/answer PDF missing or changed since extraction")
    updated["digest"] = content_digest(updated)
    updated["reviewed"] = True
    updated["review"] = {
        "reviewer": decision["reviewer"], "evidence": decision["evidence"],
        "checks": {check: True for check in sorted(CHECKS)}, "digest": updated["digest"],
        "reviewedAt": datetime.now(timezone.utc).isoformat(),
        "answerVerification": decision.get("answerVerification", "edition-matched-key"),
    }
    return updated


def export_rows(candidates: list[dict], owner: str, root: Path | None = None) -> tuple[list[dict], list[dict]]:
    owner = str(uuid.UUID(owner))
    rows, assets, seen = [], {}, {}
    for candidate in candidates:
        if not candidate.get("reviewed"):
            continue
        review = candidate.get("review", {})
        if review.get("digest") != content_digest(candidate) or not all(review.get("checks", {}).get(check) is True for check in CHECKS):
            raise ValueError(f"Changed or unverified reviewed candidate: {candidate['candidateId']}")
        validate_candidate(candidate, root)
        document = copy.deepcopy(candidate["document"])
        logical = document["id"]
        if logical in seen:
            if canonical_json(candidate["key"]) != canonical_json(seen[logical]["key"]):
                # Different explanation wording alone is fine; accepted responses must agree.
                if set(candidate["key"]["accepted"]) != set(seen[logical]["key"]["accepted"]):
                    raise ValueError(f"Conflicting keys for duplicate logical question: {logical}")
            continue
        seen[logical] = candidate
        groups = [document["passage"], document["content"]] + [option["content"] for option in document["options"]]
        for group in groups:
            for block in group:
                if block["type"] != "image":
                    continue
                reference = block["src"]
                path = local_asset(root, reference) if root else Path(reference)
                # Address by content hash so a later review cannot overwrite active attempts' media.
                digest = sha256(path) if root else candidate["source"]["sha256"]
                storage_path = f"{owner}/{digest}/{path.name}"
                block["src"] = f"exam-asset://{storage_path}"
                assets[storage_path] = {"localPath": str(path), "bucket": "sat-exam-assets", "path": storage_path, "sha256": digest, "contentType": "image/png"}
        rows.append({"id": logical, "version": document["version"], "owner_id": owner,
                     "document": document, "key": candidate["key"], "reviewed": True,
                     "source_hash": candidate["source"]["sha256"]})
    return rows, list(assets.values())


def make_sheets(candidates: list[dict], root: Path) -> list[Path]:
    from PIL import Image, ImageDraw, ImageFont
    folder = root / "review-sheets"
    folder.mkdir(parents=True, exist_ok=True)
    paths, html_items = [], []
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 18)
    for offset in range(0, len(candidates), 6):
        sheet = Image.new("RGB", (1300, 2100), "#e8e8e8")
        draw = ImageDraw.Draw(sheet)
        for position, candidate in enumerate(candidates[offset:offset + 6]):
            image_path = local_asset(root, candidate["reviewAsset"] or "missing-review-asset")
            crop = Image.open(image_path).convert("RGB")
            crop.thumbnail((620, 600))
            x, y = 15 + (position % 2) * 650, 15 + (position // 2) * 700
            draw.text((x, y), candidate["candidateId"], font=font, fill="black")
            draw.text((x, y + 23), f"Key: {','.join(candidate['key']['accepted']) or 'MISSING'} | {candidate['document']['domain']}", font=font, fill="black")
            sheet.paste(crop, (x, y + 53))
            image_ref = "../" + candidate["reviewAsset"]
            html_items.append(f"<article><h2>{html.escape(candidate['candidateId'])}</h2><img src='{html.escape(image_ref, quote=True)}' alt='Source question crop'><pre>{html.escape(json.dumps(candidate, ensure_ascii=False, indent=2))}</pre></article>")
        target = folder / f"sheet-{offset // 6 + 1:03d}.png"
        sheet.save(target)
        paths.append(target)
    (folder / "review.html").write_text("<!doctype html><html lang='en'><meta charset='utf-8'><title>Private SAT review</title><style>body{font:16px system-ui;margin:24px}article{border-bottom:2px solid #777;padding:20px 0;display:grid;grid-template-columns:1fr 1fr;gap:20px}h2{grid-column:1/-1}img{max-width:100%}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>Private review - includes answer keys</h1>" + "".join(html_items) + "</html>", encoding="utf-8")
    return paths


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["sheets", "approve", "export", "coverage"])
    parser.add_argument("--root", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--decisions", type=Path)
    parser.add_argument("--owner")
    parser.add_argument("--tests", type=int, nargs="+")
    parser.add_argument("--section", choices=["rw", "math"])
    parser.add_argument("--ids", nargs="+")
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    root = private_output(args.root)
    files = candidates_at(root)
    candidates = [candidate for _, values in files for candidate in values]
    if args.command == "approve":
        if not args.decisions:
            parser.error("--decisions is required")
        decisions = json.loads(args.decisions.read_text(encoding="utf-8"))
        if not isinstance(decisions, list) or len({decision["candidateId"] for decision in decisions}) != len(decisions):
            raise ValueError("Decisions must be a list with unique candidateId entries")
        index = {candidate["candidateId"]: candidate for candidate in candidates}
        updates = {}
        # Validate the entire batch before modifying any files.
        for decision in decisions:
            identifier = decision["candidateId"]
            if identifier not in index:
                raise ValueError(f"Unknown candidate: {identifier}")
            updates[identifier] = approve_candidate(index[identifier], decision, root)
        for path, values in files:
            if any(value["candidateId"] in updates for value in values):
                write_json(path, [updates.get(value["candidateId"], value) for value in values])
        print(f"Approved {len(updates)} explicitly reviewed candidates")
        return
    selected = [candidate for candidate in candidates if (not args.tests or candidate["source"]["test"] in args.tests)
                and (not args.section or candidate["document"]["section"] == args.section)
                and (not args.ids or candidate["candidateId"] in args.ids)]
    selected = selected[args.offset:args.offset + args.limit if args.limit else None]
    if args.command == "sheets":
        paths = make_sheets(selected, root)
        print(json.dumps([str(path) for path in paths], indent=2))
    elif args.command == "export":
        if not args.owner:
            parser.error("--owner UUID is required; no account is inferred")
        rows, assets = export_rows(selected, args.owner, root)
        if not rows:
            raise ValueError("No reviewed questions to export")
        write_json(root / "publish.rows.json", rows)
        write_json(root / "publish.assets.json", assets)
        print(json.dumps({"reviewedUniqueQuestions": len(rows), "assets": len(assets), "owner": args.owner}))
    else:
        print(json.dumps(coverage(selected), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
