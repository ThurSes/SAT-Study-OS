"""Regression tests using only original toy questions. python scripts/test_sat_import.py"""
import copy
from pathlib import Path
import tempfile
import unittest
import uuid

from import_sat_pdfs import answer_from_explanation, content_digest, logical_id, number_markers, parse_explanations, private_output, split_options, split_passage
from review_sat_import import CHECKS, approve_candidate, export_rows, local_asset, validate_candidate
from attach_sat_keys import attach_keys


def fixture():
    candidate = {
        "candidateId": "test-0-math-1-1", "reviewed": False,
        "document": {
            "id": logical_id("Original toy: 2 + 3", "math"), "version": 1,
            "section": "math", "domain": "algebra", "skillId": "linear-equations",
            "difficulty": "easy", "format": "numeric", "passage": [],
            "content": [{"id": "prompt", "type": "text", "text": "What is 2 + 3?"}], "options": [],
            "provenance": {"kind": "original", "label": "Original fixture"}, "previouslySeen": False,
        },
        "key": {"accepted": ["5"], "explanation": "Add two and three to get five."},
        "source": {"sha256": "a" * 64}, "answerSource": {"sha256": "b" * 64},
    }
    candidate["digest"] = content_digest(candidate)
    return candidate


def decision(candidate):
    return {"candidateId": candidate["candidateId"], "digest": content_digest(candidate),
            "reviewer": "Test reviewer", "evidence": "Original toy fixture inspected for the test.",
            "checks": {check: True for check in CHECKS}}


class ImportTests(unittest.TestCase):
    def test_independent_solution_replaces_wrong_edition_reference(self):
        candidate = fixture()
        candidate["source"].update(path="local-test.pdf", page=4)
        candidate["key"]["accepted"] = ["9"]
        review = decision(candidate)
        review.update(answerVerification="independent-solution", key={"accepted": ["5"], "explanation": "Two plus three equals five; the old key belongs to a different edition."})
        approved = approve_candidate(candidate, review)
        self.assertEqual(approved["key"]["accepted"], ["5"])
        self.assertEqual(approved["answerSource"]["path"], "local-test.pdf")
        self.assertEqual(approved["supersededAnswerSource"], candidate["answerSource"])
        review.pop("key")
        with self.assertRaisesRegex(ValueError, "worked explanation"):
            approve_candidate(candidate, review)

    def test_logical_id_stable_whitespace_not_sign(self):
        self.assertEqual(logical_id("x + 2\n= 4", "math"), logical_id("x + 2 = 4", "math"))
        self.assertNotEqual(logical_id("x + 2 = 4", "math"), logical_id("x - 2 = 4", "math"))
        self.assertNotEqual(logical_id("same", "math"), logical_id("same", "rw"))

    def test_options_preserve_multiline(self):
        prompt, options = split_options("Original question\nA) first\ncontinued\nB) second\nC) third\nD) fourth")
        self.assertEqual(prompt, "Original question")
        self.assertEqual([value["id"] for value in options], list("ABCD"))
        self.assertEqual(options[0]["content"][0]["text"], "first\ncontinued")

    def test_missing_options_not_invented(self):
        self.assertEqual(split_options("Question\nA) one\nC) three")[1], [])

    def test_passage_split(self):
        passage, prompt = split_passage("A toy passage.\nWhich choice best completes the text?", "rw")
        self.assertEqual(passage[0]["text"], "A toy passage.")
        self.assertTrue(prompt[0]["text"].startswith("Which choice"))

    def test_explanation_matching_includes_section_module(self):
        records = parse_explanations([
            "SAT ANSWER EXPLANATIONS READING AND WRITING: MODULE 1\nQUESTION 1\nChoice A is the best answer because this is a fixture.",
            "SAT ANSWER EXPLANATIONS READING AND WRITING: MODULE 1\nContinued reasoning.\nQUESTION 2\nChoice C is the best answer because another fixture.",
            "SAT ANSWER EXPLANATIONS MATH: MODULE 1\nMath\nModule 1\nQUESTION 1\nThe correct answer is 5. Add two and three.",
            "SAT ANSWER EXPLANATIONS MATH: MODULE 2\nMath\nModule 2\nQUESTION 1\nThe correct answer is 1/2 or .5. These values are equal.",
        ], "hash")
        self.assertEqual(records[("rw", 1, 1)]["accepted"], ["A"])
        self.assertIn("Continued reasoning.", records[("rw", 1, 1)]["explanation"])
        self.assertEqual(records[("math", 1, 1)]["accepted"], ["5"])
        self.assertEqual(records[("math", 2, 1)]["accepted"], ["1/2", ".5"])
        self.assertNotIn("Math\nModule", records[("rw", 1, 2)]["explanation"])

    def test_ambiguous_answers_remain_unavailable(self):
        self.assertEqual(answer_from_explanation("The correct answer is the positive value. x = 9."), [])
        self.assertEqual(answer_from_explanation("Choice B is incorrect. A later equation is 5."), [])

    def test_duplicate_answer_heading_fails(self):
        with self.assertRaises(ValueError):
            parse_explanations(["MATH: MODULE 1\nQUESTION 1\nThe correct answer is 4.\nQUESTION 1\nThe correct answer is 5."], "hash")

    def test_import_does_not_approve(self):
        candidate = fixture()
        self.assertEqual(export_rows([candidate], str(uuid.uuid4()))[0], [])

    def test_all_checks_and_evidence_required(self):
        candidate = fixture()
        for check in CHECKS:
            review = decision(candidate)
            review["checks"][check] = False
            with self.assertRaises(ValueError):
                approve_candidate(candidate, review)
        review = decision(candidate)
        review["evidence"] = ""
        with self.assertRaises(ValueError):
            approve_candidate(candidate, review)

    def test_stale_review_rejected_before_and_after_approval(self):
        candidate = fixture()
        review = decision(candidate)
        candidate["key"]["accepted"] = ["6"]
        with self.assertRaises(ValueError):
            approve_candidate(candidate, review)
        approved = approve_candidate(candidate, decision(candidate))
        approved["document"]["content"][0]["text"] = "Changed question"
        with self.assertRaises(ValueError):
            export_rows([approved], str(uuid.uuid4()))

    def test_numeric_bounds_and_zero_denominator(self):
        for answer in ["1/0", "123456", "-123456", "5%", "1,2", "NaN", "5+2"]:
            candidate = fixture()
            candidate["key"]["accepted"] = [answer]
            with self.assertRaises(ValueError, msg=answer):
                validate_candidate(candidate)
        for answer in ["12345", "-12345", "1/2", ".5", "-0.25"]:
            candidate = fixture()
            candidate["key"]["accepted"] = [answer]
            validate_candidate(candidate)

    def test_mc_answer_must_belong_to_four_options(self):
        candidate = fixture()
        candidate["document"]["format"] = "multiple-choice"
        candidate["document"]["options"] = split_options("A) 1\nB) 2\nC) 3\nD) 4")[1]
        candidate["key"]["accepted"] = ["E"]
        with self.assertRaises(ValueError):
            validate_candidate(candidate)
        candidate["key"]["accepted"] = ["C"]
        validate_candidate(candidate)

    def test_export_private_owner_dedup_and_conflicting_keys(self):
        candidate = fixture()
        approved = approve_candidate(candidate, decision(candidate))
        owner = str(uuid.uuid4())
        rows, _ = export_rows([approved, copy.deepcopy(approved)], owner)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["owner_id"], owner)
        self.assertNotIn("review", rows[0]["document"])
        changed = fixture()
        changed["key"]["accepted"] = ["6"]
        changed = approve_candidate(changed, decision(changed))
        with self.assertRaises(ValueError):
            export_rows([approved, changed], owner)

    def test_paths_stay_private(self):
        with self.assertRaises(ValueError):
            private_output(Path("public/sat"))
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "private"
            root.mkdir()
            outside = Path(temp) / "outside.png"
            outside.write_bytes(b"fixture")
            with self.assertRaises(ValueError):
                local_asset(root, "../outside.png")

    def test_review_patch_cannot_change_source_identity(self):
        candidate = fixture()
        review = decision(candidate)
        review["document"] = {"id": str(uuid.uuid4())}
        with self.assertRaises(ValueError):
            approve_candidate(candidate, review)


class ScoringCacheTests(unittest.TestCase):
    def test_new_edition_gray_question_bars(self):
        class Page:
            width, height = 612, 792
            rects = [dict(x0=315, x1=558, top=120, bottom=132.5, fill=True, non_stroking_color=(0.82, 0.826, 0.832))]
            def crop(self, bbox):
                if bbox[2] != 339:
                    raise AssertionError("Only the numbered end of the gray bar should be read")
                return self
            def extract_text(self):
                return "17"
        self.assertEqual(number_markers(Page())[0]["number"], 17)

    def test_question_tabs_exclude_white_equation_backgrounds(self):
        class Page:
            width, height = 600, 800
            rects = [dict(x0=40, x1=58, top=100, bottom=112, fill=True, non_stroking_color=(0, 0, 0, 1)),
                     dict(x0=350, x1=368, top=200, bottom=212, fill=True, non_stroking_color=1.0)]
            def crop(self, bbox):
                return self
            def extract_text(self):
                return "3\n-"
        self.assertEqual([item["number"] for item in number_markers(Page())], [3])

    def test_key_coordinates_conflicts_and_review_preservation(self):
        cache = {"source": "https://satsuite.collegeboard.org/media/pdf/scoring-sat-practice-test-4-digital.pdf",
                 "groups": [[["A"] for _ in range(size)] for size in [33, 33, 27, 27]]}
        cache["groups"][3][0] = ["5"]
        candidate = fixture()
        candidate["source"].update(test=4, section="math", module=2, number=1)
        candidate["key"]["accepted"] = []
        candidate["answerSource"] = None
        candidate["flags"] = ["missing-answer", "answer-edition-not-verified"]
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "key-4.json"
            path.write_text("original test cache", encoding="utf-8")
            updated = attach_keys([candidate], cache, path, 4)[0]
            self.assertEqual(updated["key"]["accepted"], ["5"])
            self.assertFalse(updated["reviewed"])
            self.assertEqual(candidate["key"]["accepted"], [])
            self.assertIn("answer-edition-not-verified", updated["flags"])
            self.assertEqual(updated["digest"], content_digest(updated))
            updated["reviewed"] = True
            self.assertEqual(attach_keys([updated], cache, path, 4)[0], updated)
            cache["groups"][3][0] = ["6"]
            with self.assertRaisesRegex(ValueError, "Conflicting key"):
                attach_keys([updated], cache, path, 4)

    def test_wrong_edition_and_incomplete_tables_rejected(self):
        with self.assertRaisesRegex(ValueError, "source"):
            attach_keys([], {"source": "untrusted"}, Path("unused"), 4)
        with self.assertRaisesRegex(ValueError, "complete"):
            attach_keys([], {"source": "https://satsuite.collegeboard.org/media/pdf/scoring-sat-practice-test-4-digital.pdf", "groups": []}, Path("unused"), 4)


if __name__ == "__main__":
    unittest.main(verbosity=2)
