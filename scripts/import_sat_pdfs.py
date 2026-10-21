"""Private, review-gated PDF intake. Never publishes or marks an item reviewed.

Usage:
  python scripts/import_sat_pdfs.py inventory --source ../SAT
  python scripts/import_sat_pdfs.py extract --source ../SAT --render

Dependencies: pdfplumber, pypdf, pypdfium2, Pillow. Source files and output must
remain private. Answers are matched by test/section/module/question, with the
source and answer document hashes retained for explicit edition verification.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "artifacts" / "private-sat"
DOMAINS = {
    "rw": ["information-and-ideas", "craft-and-structure", "expression-of-ideas", "standard-english-conventions"],
    "math": ["algebra", "advanced-math", "problem-solving-and-data-analysis", "geometry-and-trigonometry"],
}
ID_NAMESPACE = uuid.UUID("b0061f07-43df-4fa4-8a82-fdc3378fb078")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_json(value) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def content_digest(candidate: dict) -> str:
    """Bind review to precisely the content, key, and source being exported."""
    reviewed = {key: candidate.get(key) for key in ("document", "key", "source", "answerSource")}
    return hashlib.sha256(canonical_json(reviewed).encode()).hexdigest()


def normalized_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).replace("\u00ad", "")
    return re.sub(r"\s+", " ", text).strip()


def logical_id(text: str, section: str) -> str:
    # Retain signs, case, punctuation and numeric content: a changed sign matters.
    return str(uuid.uuid5(ID_NAMESPACE, section + ":" + normalized_text(text)))


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def private_output(path: Path) -> Path:
    resolved = path.resolve()
    private_root = DEFAULT_OUTPUT.resolve()
    if not resolved.is_relative_to(private_root):
        raise ValueError(f"Output must stay inside ignored private directory: {private_root}")
    return resolved


def discover(source: Path, tests: set[int] | None = None, answers_dir: Path | None = None) -> list[dict]:
    from pypdf import PdfReader
    found = []
    for path in sorted(source.rglob("*.pdf")):
        match = re.fullmatch(r"sat-practice-test-(\d+)-digital\.pdf", path.name, re.I)
        if not match or (tests and int(match[1]) not in tests):
            continue
        reader = PdfReader(path)
        metadata = reader.metadata or {}
        answers = sorted(source.rglob(f"sat-practice-test-{match[1]}-answers-digital.pdf"))
        if answers_dir:
            answers = sorted(set(answers + list(answers_dir.rglob(f"sat-practice-test-{match[1]}-answers-digital.pdf"))))
        found.append({
            "test": int(match[1]), "path": str(path.resolve()), "sha256": sha256(path),
            "pages": len(reader.pages),
            "pdfMetadata": {str(key): str(value) for key, value in metadata.items()},
            "answerPaths": [str(answer.resolve()) for answer in answers],
        })
    numbers = [item["test"] for item in found]
    if len(numbers) != len(set(numbers)):
        raise ValueError("Multiple editions of one test found. Use a source folder with one edition per test.")
    return sorted(found, key=lambda item: item["test"])


def answer_from_explanation(text: str) -> list[str]:
    choice = re.search(r"\bChoice\s+([A-D])\s+is\s+(?:the\s+)?(?:best|correct)\s+answer", text, re.I)
    if choice:
        return [choice[1].upper()]
    numeric = re.search(r"\bThe correct answer is\s+([^\n]+)", text, re.I)
    if not numeric:
        return []
    # Only exact, simple answer sentences. No inference from worked calculations.
    sentence = re.split(r"\.\s+[A-Z]|[;:]", numeric[1], maxsplit=1)[0].strip().rstrip(".")
    if not re.fullmatch(r"[-\d./ ,]+(?:\s+(?:or|and)\s+[-\d./ ,]+)*", sentence):
        return []
    values = re.split(r"\s+(?:or|and)\s+|,\s*", sentence)
    return [value.strip() for value in values if re.fullmatch(r"-?(?:\d+(?:\.\d*)?|\.\d+|\d+/\d+)", value.strip())]


def parse_explanations(pages: list[str], source_hash: str) -> dict[tuple[str, int, int], dict]:
    records: dict[tuple[str, int, int], dict] = {}
    current = None
    section, module = None, None
    for page_number, text in enumerate(pages, 1):
        heading = re.search(r"(READING AND WRITING|MATH)\s*:?\s*MODULE\s*(\d)", text, re.I)
        if heading:
            section = "math" if heading[1].upper() == "MATH" else "rw"
            module = int(heading[2])
        # Remove repeated page headings and footers before joining continuation pages.
        text = re.sub(r"(?im)^.*SAT (?:PRACTICE TEST|ANSWER EXPLANATIONS).*$", "", text)
        text = re.sub(r"(?m)^\s*\d{1,3}\s*$", "", text)
        chunks = re.split(r"(?im)^\s*QUESTION\s+(\d+)\s*$", text)
        if current and chunks[0].strip() and not re.search(r"\bModule\s+[12]\b", chunks[0]):
            records[current]["explanation"] += "\n" + chunks[0].strip()
        for index in range(1, len(chunks), 2):
            if section is None or module is None:
                continue
            current = (section, module, int(chunks[index]))
            if current in records:
                raise ValueError(f"Duplicate answer heading {current}; edition/layout needs review")
            records[current] = {"explanation": chunks[index + 1].strip(), "page": page_number, "sha256": source_hash}
    for value in records.values():
        value["accepted"] = answer_from_explanation(value["explanation"])
    return records


def number_markers(page) -> list[dict]:
    """Locate numbered black tabs; do not confuse equation values with questions."""
    markers = []
    for rectangle in page.rects:
        color = rectangle.get("non_stroking_color")
        black = color == 0 or color in ((0, 0, 0), (0, 0, 0, 1))
        width, height = rectangle["x1"] - rectangle["x0"], rectangle["bottom"] - rectangle["top"]
        # Newer editions print black question numbers on a long pale gray bar,
        # whereas earlier editions use a small black tab with white numbers.
        gray = isinstance(color, (list, tuple)) and len(color) == 3 and all(0.75 <= v <= 0.95 for v in color)
        tab = black and 12 <= width <= 28
        bar = gray and 150 <= width <= page.width / 2
        if not rectangle.get("fill") or not ((tab or bar) and 8 <= height <= 19 and 75 < rectangle["top"] < page.height - 70):
            continue
        # Restrict extraction before word grouping: OCR decoration outside a tab
        # otherwise merges with its number and silently loses questions.
        label = (page.crop((rectangle["x0"], rectangle["top"] - 2,
                           rectangle["x0"] + 24 if bar else rectangle["x1"], rectangle["bottom"] + 2)).extract_text() or "").strip()
        label = re.sub(r"[\s\-~_.]", "", label)
        if re.fullmatch(r"\d{1,2}", label):
            candidate = {"number": int(label), "x0": rectangle["x0"], "top": rectangle["top"], "bottom": rectangle["bottom"]}
            if not any(abs(old["top"] - candidate["top"]) < 2 and abs(old["x0"] - candidate["x0"]) < 2 for old in markers):
                markers.append(candidate)
    return sorted(markers, key=lambda marker: (marker["x0"] > page.width / 2, marker["top"]))


def split_options(text: str) -> tuple[str, list[dict]]:
    matches = list(re.finditer(r"(?m)^\s*([A-D])\)\s*", text))
    if [match[1] for match in matches] != list("ABCD"):
        return text.strip(), []
    options = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index < 3 else len(text)
        options.append({"id": match[1], "label": match[1], "content": [{"id": f"option-{match[1]}", "type": "text", "text": text[match.end():end].strip()}]})
    return text[:matches[0].start()].strip(), options


def split_passage(text: str, section: str) -> tuple[list[dict], list[dict]]:
    if section == "rw":
        prompts = list(re.finditer(r"(?m)^(?:Which (?:choice|finding|statement|quotation)|According to (?:the|Text)|The student wants|What is the main|As used in the text|Based on the text)", text))
        if prompts and prompts[-1].start() > 0:
            position = prompts[-1].start()
            return ([{"id": "passage", "type": "text", "text": text[:position].strip()}],
                    [{"id": "prompt", "type": "text", "text": text[position:].strip()}])
    return [], [{"id": "prompt", "type": "text", "text": text}]


def classification_hint(text: str, section: str) -> tuple[str, str]:
    lower = text.lower()
    if section == "rw":
        if "standard english" in lower:
            return DOMAINS[section][3], "boundaries-and-form"
        if "transition" in lower or "student wants" in lower:
            return DOMAINS[section][2], "transitions" if "transition" in lower else "rhetorical-synthesis"
        if any(phrase in lower for phrase in ("precise word", "logical and precise", "as used", "overall structure", "main purpose", "text 2")):
            return DOMAINS[section][1], "craft-and-structure-review"
        return DOMAINS[section][0], "information-and-ideas-review"
    if any(phrase in lower for phrase in ("triangle", "circle", "radius", "angle", "volume", "radian", "sin(", "cos(")):
        return DOMAINS[section][3], "geometry-review"
    if any(phrase in lower for phrase in ("percent", "probability", "median", "mean", "sample", "survey", "standard deviation", "ratio")):
        return DOMAINS[section][2], "data-analysis-review"
    if any(phrase in lower for phrase in ("quadratic", "exponential", "polynomial", "parabola", "square root", "x2", "x²")):
        return DOMAINS[section][1], "advanced-math-review"
    return DOMAINS[section][0], "algebra-review"


_render_cache = None


def render_crop(renderer, page_index: int, bbox: tuple[float, float, float, float], destination: Path, scale=2.0) -> None:
    global _render_cache
    page = renderer[page_index]
    width, height = page.get_size()
    left, top, right, bottom = bbox
    # Render once per page, not twice for every question on that page.
    if _render_cache is None or _render_cache[:3] != (renderer, page_index, scale):
        bitmap = page.render(scale=scale)
        _render_cache = (renderer, page_index, scale, bitmap.to_pil().copy())
        bitmap.close()
    destination.parent.mkdir(parents=True, exist_ok=True)
    _render_cache[3].crop((round(left*scale), round(top*scale), round(right*scale), round(bottom*scale))).save(destination)
    page.close()


def extract_test(item: dict, output: Path, render: bool) -> tuple[list[dict], list[dict]]:
    import pdfplumber
    import pypdfium2
    answers = {}
    answer_path = None
    if len(item["answerPaths"]) == 1:
        answer_path = Path(item["answerPaths"][0])
        with pdfplumber.open(answer_path) as pdf:
            answers = parse_explanations([page.extract_text() or "" for page in pdf.pages], sha256(answer_path))
    candidates, warnings = [], []
    section, module = None, None
    renderer = pypdfium2.PdfDocument(item["path"]) if render else None
    try:
        with pdfplumber.open(item["path"]) as pdf:
            for page_index, page in enumerate(pdf.pages):
                heading = page.crop((0, 0, page.width, min(320, page.height))).extract_text() or ""
                module_heading = re.search(r"Module\s*([12])", heading, re.I)
                if module_heading:
                    module = int(module_heading[1])
                if re.search(r"Reading and Writing", heading, re.I):
                    section = "rw"
                elif re.search(r"(?m)^\s*Math\s*$", heading, re.I):
                    section = "math"
                markers = number_markers(page)
                if not markers:
                    continue
                if section is None or module is None:
                    warnings.append({"page": page_index + 1, "reason": "Question tabs without a recognized section/module"})
                    continue
                for marker_index, marker in enumerate(markers):
                    right_column = marker["x0"] > page.width / 2
                    following = [candidate for candidate in markers[marker_index + 1:] if (candidate["x0"] > page.width / 2) == right_column]
                    bars = [rectangle for rectangle in page.rects if abs(rectangle["top"] - marker["top"]) < 2 and rectangle["x1"] - rectangle["x0"] > 150
                            and (rectangle["x0"] > page.width / 2) == right_column]
                    x1 = max((bar["x1"] for bar in bars), default=(page.width - 30 if right_column else page.width / 2 - 10))
                    bottom = following[0]["top"] - 5 if following else page.height - 72
                    bbox = (max(0, marker["x0"] - 2), marker["bottom"] + 2, min(page.width, x1 + 3), bottom)
                    crop = page.crop(bbox)
                    raw = crop.extract_text(x_tolerance=2, y_tolerance=3) or ""
                    raw = re.sub(r"(?m)^\s*(?:Unauthorized copying.*|CONTINUE|STOP|[-~.]{4,})\s*$", "", raw).strip()
                    prompt, options = split_options(raw)
                    passage, content = split_passage(prompt, section)
                    domain, skill = classification_hint(raw, section)
                    number = marker["number"]
                    candidate_id = f"test-{item['test']}-{section}-{module}-{number}"
                    question_id = logical_id(raw, section)
                    answer = answers.get((section, module, number))
                    asset = f"assets/{item['sha256']}/{candidate_id}.png"
                    review_asset = f"review/{item['sha256']}/{candidate_id}.png"
                    flags = ["content-not-visually-reviewed", "taxonomy-is-editorial-hint", "difficulty-is-editorial-hint", "answer-edition-not-verified"]
                    if not options and section == "rw":
                        flags.append("missing-rw-options")
                    if not answer or not answer["accepted"]:
                        flags.append("missing-answer")
                    if "\ufffd" in raw or "(cid:" in raw:
                        flags.append("unmapped-glyphs")
                    figures = [obj for obj in crop.images + crop.curves if obj.get("width", 0) > 25 and obj.get("height", 0) > 15]
                    if section == "math" or figures:
                        flags.append("mathematical-or-graphic-layout-needs-review")
                    if renderer:
                        render_crop(renderer, page_index, (bbox[0], marker["top"] - 2, bbox[2], bottom), output / review_asset)
                        # Preserve the question region as a lossless source asset. The reviewer
                        # decides which figures to use; this never replaces accessible text by itself.
                        render_crop(renderer, page_index, bbox, output / asset)
                    document = {
                        "id": question_id, "version": 1, "section": section, "domain": domain,
                        "skillId": skill, "difficulty": "medium", "format": "multiple-choice" if options else "numeric",
                        "passage": passage, "content": content, "options": options,
                        "provenance": {"kind": "personal-pdf", "label": f"SAT Practice Test {item['test']} · {section.upper()} Module {module} Question {number}", "sourceTest": item["test"], "page": page_index + 1},
                        "previouslySeen": False,
                    }
                    candidate = {
                        "candidateId": candidate_id, "document": document,
                        "key": {"accepted": answer["accepted"] if answer else [], "explanation": answer["explanation"] if answer else ""},
                        "source": {"path": item["path"], "sha256": item["sha256"], "test": item["test"], "section": section, "module": module, "number": number, "page": page_index + 1, "bbox": list(bbox)},
                        "answerSource": {"path": str(answer_path), "sha256": answer["sha256"], "page": answer["page"]} if answer else None,
                        "sourceText": raw, "reviewAsset": review_asset if render else None,
                        "figureCandidateAsset": asset if render else None,
                        "reviewed": False, "flags": flags,
                    }
                    candidate["digest"] = content_digest(candidate)
                    candidates.append(candidate)
                print(f"Test {item['test']}: page {page_index + 1}/{len(pdf.pages)}; {len(candidates)} candidates", flush=True)
    finally:
        if renderer:
            renderer.close()
    seen = set()
    for candidate in candidates:
        if candidate["candidateId"] in seen:
            raise ValueError(f"Ambiguous repeated source coordinate: {candidate['candidateId']}")
        seen.add(candidate["candidateId"])
    return candidates, warnings


def coverage(candidates: list[dict]) -> dict:
    counts: dict[str, int] = {}
    groups: dict[str, list[str]] = {}
    for candidate in candidates:
        document = candidate["document"]
        key = f"{document['section']}/{document['domain']}/{document['format']}"
        counts[key] = counts.get(key, 0) + 1
        groups.setdefault(document["id"], []).append(candidate["candidateId"])
    return {"candidates": len(candidates), "uniqueLogicalItems": len(groups), "counts": counts,
            "duplicates": [ids for ids in groups.values() if len(ids) > 1],
            "withAnswer": sum(bool(candidate["key"]["accepted"]) for candidate in candidates),
            "reviewed": sum(candidate.get("reviewed", False) for candidate in candidates)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["inventory", "extract"])
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--tests", type=int, nargs="+")
    parser.add_argument("--answers-dir", type=Path, help="Additional folder containing official answer explanation PDFs")
    parser.add_argument("--render", action="store_true", help="Render private question crops for visual review")
    args = parser.parse_args()
    output = private_output(args.output)
    inventory = discover(args.source.resolve(), set(args.tests) if args.tests else None, args.answers_dir)
    if not inventory:
        parser.error("No sat-practice-test-N-digital.pdf files found")
    write_json(output / "inventory.json", inventory)
    if args.command == "inventory":
        print(json.dumps({"tests": [item["test"] for item in inventory], "pages": sum(item["pages"] for item in inventory)}))
        return
    all_candidates, warnings = [], []
    for item in inventory:
        destination = output / f"test-{item['test']}.candidates.json"
        if destination.exists():
            previous = json.loads(destination.read_text(encoding="utf-8"))
            if any(candidate.get("reviewed") for candidate in previous):
                raise ValueError(f"Refusing to overwrite reviewed content: {destination}")
        candidates, test_warnings = extract_test(item, output, args.render)
        write_json(destination, candidates)
        all_candidates.extend(candidates)
        warnings.extend({"test": item["test"], **warning} for warning in test_warnings)
    summary = {**coverage(all_candidates), "warnings": warnings, "note": "All extracted content is unpublished. Classification and answer matching require human review."}
    write_json(output / "coverage.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
