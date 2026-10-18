import { describe, expect, it } from "vitest";
import { validStudy, isCivilDate, isUuid } from "./validation";
import { safeNext } from "../auth/redirect";
import type { StudyPlanItem } from "@/types/domain";
import { toStudyDate } from "../../lib/format-date";

const item: StudyPlanItem = { id: "d86655ce-a301-4900-aea0-f020bc580001", userId: "41cd53a8-cf66-4d7a-8d25-f053046759c7", skillId: "skill", title: "Revisão", date: "2026-10-18", time: "09:00", durationMinutes: 25, status: "planned", personalDifficulty: null, notes: "", resource: null };
const skills = new Set(["skill"]);

describe("workspace input boundaries", () => {
  it("accepts valid studies, leap dates and bounded durations", () => {
    expect(validStudy(item, skills)).toBe(true);
    expect(isCivilDate("2028-02-29")).toBe(true);
    expect(validStudy({ ...item, durationMinutes: 1440 }, skills)).toBe(true);
  });
  it("rejects forged skills, invalid dates, malformed IDs and overflow", () => {
    expect(isUuid("not-an-id")).toBe(false);
    expect(isCivilDate("2026-02-29")).toBe(false);
    for (const patch of [{ skillId: "forged" }, { date: "2026-13-01" }, { time: "24:01" }, { durationMinutes: 0 }, { durationMinutes: 1441 }, { durationMinutes: 1.5 }, { title: " " }, { notes: "a".repeat(4001) }]) expect(validStudy({ ...item, ...patch }, skills)).toBe(false);
  });
  it("allows safe resources and rejects executable or network-path URLs", () => {
    for (const href of ["https://example.com/lesson", "http://example.com", "/conteudos"]) expect(validStudy({ ...item, resource: { label: "Recurso", href } }, skills)).toBe(true);
    for (const href of ["javascript:alert(1)", "data:text/html,test", "//evil.test/path", "/\\evil.test", "https://" ]) expect(validStudy({ ...item, resource: { label: "Recurso", href } }, skills)).toBe(false);
  });
});

describe("auth redirect destinations", () => {
  it("accepts only local app paths", () => {
    expect(safeNext("/estudos?status=planned")).toBe("/estudos?status=planned");
    for (const value of ["https://evil.test", "//evil.test", "/\\evil.test", "/\n/evil.test", "/\t/evil.test", "/ /evil.test", "/auth/callback", "/login", null, 4]) expect(safeNext(value)).toBe("/");
  });
});

it("groups UTC timestamps by the student's civil day", () => {
  expect(toStudyDate("2026-10-19T02:59:59Z")).toBe("2026-10-18");
  expect(toStudyDate("2026-10-19T03:00:00Z")).toBe("2026-10-19");
});
