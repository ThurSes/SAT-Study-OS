import { describe, expect, it } from "vitest";
import { contentSkills, contentSources, lessons } from "./content-catalog";
import { DOMAIN_LABELS } from "../../lib/sat/taxonomy";
import { questionSkills } from "../questions/catalog";

describe("content coverage", () => {
  it("covers every SAT domain with explicit skill coverage in both sections", () => {
    expect([...new Set(lessons.map((item) => item.skill.domain))].sort()).toEqual(Object.keys(DOMAIN_LABELS).sort());
    expect(lessons.filter((item) => item.skill.section === "rw")).toHaveLength(11);
    expect(lessons.filter((item) => item.skill.section === "math")).toHaveLength(21);
    const domainCounts = Object.fromEntries(Object.keys(DOMAIN_LABELS).map((domain) => [domain, lessons.filter((item) => item.skill.domain === domain).length]));
    expect(domainCounts).toEqual({ "information-and-ideas": 4, "craft-and-structure": 3, "expression-of-ideas": 2, "standard-english-conventions": 2, algebra: 5, "advanced-math": 5, "problem-solving-and-data-analysis": 7, "geometry-and-trigonometry": 4 });
  });
  it("has stable unique identities and a deduplicated skill catalog", () => {
    expect(new Set(lessons.map((item) => item.id)).size).toBe(lessons.length);
    expect(new Set(contentSkills.map((item) => item.id)).size).toBe(contentSkills.length);
    for (const item of lessons) expect(contentSkills).toContainEqual(item.skill);
    for (const skill of contentSkills) expect(skill.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    for (const skill of questionSkills) expect(contentSkills.some(content => content.id === skill.id && content.section === skill.section && content.domain === skill.domain)).toBe(true);
  });
  it("provides explanatory material and a worked example for every skill", () => {
    for (const item of lessons) {
      expect(item.objectives.length).toBeGreaterThanOrEqual(2);
      expect(item.explanation.join(" ").length).toBeGreaterThan(200);
      expect(item.example.prompt.length).toBeGreaterThan(20);
      expect(item.example.steps.length).toBeGreaterThanOrEqual(3);
      expect(item.example.answer.trim().length).toBeGreaterThan(0);
      expect(item.pitfalls.length).toBeGreaterThanOrEqual(2);
      expect(item.minutes).toBeGreaterThan(0);
    }
  });
  it("keeps lesson examples separate from active question payloads and cites official coverage", () => {
    for (const item of lessons) {
      expect(item.id).toMatch(/^lesson-/);
      expect(item).not.toHaveProperty("questionId");
      expect(item).not.toHaveProperty("options");
      expect(item).not.toHaveProperty("correctOptionId");
    }
    expect(contentSources.every((source) => new URL(source.href).hostname === "satsuite.collegeboard.org")).toBe(true);
  });
});
