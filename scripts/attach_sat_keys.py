"""Attach locally cached official scoring tables to unpublished PDF candidates.

Does not approve questions or infer explanations. Run after extraction:
  python scripts/attach_sat_keys.py --tests 4 6 7 8 9 10 11
"""
import argparse
import copy
import json
import re
from pathlib import Path

from import_sat_pdfs import DEFAULT_OUTPUT, content_digest, private_output, sha256, write_json


def attach_keys(candidates: list[dict], cache: dict, cache_path: Path, test: int) -> list[dict]:
    expected_url = f"https://satsuite.collegeboard.org/media/pdf/scoring-sat-practice-test-{test}-digital.pdf"
    if cache.get("source") != expected_url:
        raise ValueError("Scoring source does not match the selected test")
    groups = cache.get("groups")
    if not isinstance(groups, list) or len(groups) != 4 or [len(g) for g in groups] != [33, 33, 27, 27]:
        raise ValueError("Expected complete RW/RW/Math/Math scoring tables")
    for group in groups:
        for answers in group:
            if not isinstance(answers, list) or not answers or any(
                not isinstance(value, str) or not re.fullmatch(r"[A-D]|-?(?:\d+(?:\.\d*)?|\.\d+|\d+/[1-9]\d*)", value)
                for value in answers
            ):
                raise ValueError("Malformed scoring entry")
    updated = copy.deepcopy(candidates)
    seen = set()
    for candidate in updated:
        source = candidate["source"]
        section, module, number = source["section"], source["module"], source["number"]
        if source["test"] != test or section not in ("rw", "math") or module not in (1, 2):
            raise ValueError("Candidate coordinates do not match scoring source")
        coordinate = (section, module, number)
        if coordinate in seen or not 1 <= number <= (33 if section == "rw" else 27):
            raise ValueError("Duplicate or invalid question coordinate")
        seen.add(coordinate)
        accepted = groups[(0 if section == "rw" else 2) + module - 1][number - 1]
        existing = candidate["key"]["accepted"]
        if existing and set(existing) != set(accepted):
            raise ValueError(f"Conflicting key for {candidate['candidateId']}")
        # Already reviewed sources and digests must never be rewritten.
        if candidate.get("reviewed"):
            if not existing:
                raise ValueError("Reviewed candidate has no answer")
            continue
        if candidate.get("answerSource") and existing:
            continue
        candidate["key"]["accepted"] = accepted
        candidate["answerSource"] = {"path": str(cache_path.resolve()), "sha256": sha256(cache_path),
                                     "url": expected_url, "kind": "official-scoring-table-cache"}
        candidate["flags"] = [flag for flag in candidate.get("flags", []) if flag != "missing-answer"]
        candidate["digest"] = content_digest(candidate)
    return updated


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--tests", type=int, nargs="+", required=True)
    args = parser.parse_args()
    root = private_output(args.root)
    pending = []
    for test in args.tests:
        path = root / f"test-{test}.candidates.json"
        cache_path = root / "references" / f"key-{test}.json"
        candidates = json.loads(path.read_text(encoding="utf-8"))
        cache = json.loads(cache_path.read_text(encoding="utf-8"))
        pending.append((path, attach_keys(candidates, cache, cache_path, test)))
    # Validate every requested test before any file is changed.
    for path, candidates in pending:
        write_json(path, candidates)
    print(f"Attached scoring sources for {len(pending)} tests; editorial review still required.")


if __name__ == "__main__":
    main()
