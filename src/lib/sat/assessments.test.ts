import { describe, expect, it } from "vitest";
import { buildExternalAssessment, type ExternalAssessmentInput } from "./assessments";

const input: ExternalAssessmentInput = {
  title: "Resultado de outubro",
  date: "2026-10-18",
  origin: "official_self_reported",
  readingWriting: "650",
  math: "700",
  material: "",
  conversionMethod: "",
  notes: "",
};

describe("external assessment validation", () => {
  it("keeps Bluebook practice separate from official test scores", () => {
    const result = buildExternalAssessment({ ...input, origin: "bluebook_self_reported" }, "bluebook");
    expect(result).toMatchObject({ok:true,assessment:{origin:"bluebook_self_reported",readingWriting:650,math:700}});
    if(result.ok) expect(result.assessment).not.toHaveProperty("conversionMethod");
  });
  it("builds an official self-reported result without mutating input or carrying print-only fields", () => {
    const source = Object.freeze({
      ...input,
      title: "  Resultado de outubro  ",
      readingWriting: " 650 ",
      math: " 700 ",
      material: "Irrelevant material".repeat(100),
      conversionMethod: "Irrelevant method".repeat(100),
      notes: "  Declarado pelo estudante.  ",
    });
    expect(buildExternalAssessment(source, "caller-id")).toEqual({
      ok: true,
      assessment: {
        id: "caller-id",
        title: "Resultado de outubro",
        date: "2026-10-18",
        origin: "official_self_reported",
        readingWriting: 650,
        math: 700,
        notes: "Declarado pelo estudante.",
      },
    });
    expect(source.title).toBe("  Resultado de outubro  ");
  });

  it("keeps material and conversion provenance on a printed estimate", () => {
    expect(buildExternalAssessment({
      ...input,
      origin: "printed_estimate",
      material: "  Caderno impresso  ",
      conversionMethod: "  Tabela fornecida pelo material  ",
      notes: "   ",
    }, "printed-id")).toEqual({
      ok: true,
      assessment: {
        id: "printed-id",
        title: input.title,
        date: input.date,
        origin: "printed_estimate",
        readingWriting: 650,
        math: 700,
        material: "Caderno impresso",
        conversionMethod: "Tabela fornecida pelo material",
      },
    });
  });

  it("accepts inclusive section boundaries without producing a total or an experimental metric", () => {
    const result = buildExternalAssessment({ ...input, readingWriting: "200", math: "800" }, "boundaries");
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.assessment).toMatchObject({ readingWriting: 200, math: 800 });
    expect(result.assessment).not.toHaveProperty("total");
    expect(result.assessment).not.toHaveProperty("correct");
  });

  it("rejects blank titles and unsupported origins including experimental", () => {
    expect(buildExternalAssessment({ ...input, title: " \n " }, "invalid")).toEqual({ ok: false, error: "Informe o título do resultado." });
    for (const origin of ["", "experimental", "official"]) {
      expect(buildExternalAssessment({ ...input, origin }, "invalid")).toMatchObject({ ok: false });
    }
  });

  it("requires digits and valid section ranges instead of coercing numbers", () => {
    for (const [index, score] of ["", " ", "199", "801", "NaN", "Infinity", "6.5e2", "650.0", "650,0", "-200", "+650", "650 points"].entries()) {
      const field = index % 2 === 0 ? "readingWriting" : "math";
      const result = buildExternalAssessment({ ...input, [field]: score }, "invalid");
      expect(result, `${field}: ${score}`).toMatchObject({ ok: false });
      if (!result.ok) expect(result.error).toContain(field === "math" ? "Math" : "Reading and Writing");
    }
  });

  it("validates calendar dates without relying on timezone or date rollover", () => {
    for (const date of ["2026-02-30", "2025-02-29", "1900-02-29", "2026-04-31", "2026-00-10", "2026-13-01", "2026-01-00", "0000-01-01", "2026-2-01", "2026-10-18T00:00:00Z", ""]) {
      expect(buildExternalAssessment({ ...input, date }, "invalid"), date).toMatchObject({ ok: false });
    }
    for (const date of ["2000-02-29", "2024-02-29", "2026-04-30", "0001-01-01"]) {
      expect(buildExternalAssessment({ ...input, date }, "valid"), date).toMatchObject({ ok: true, assessment: { date } });
    }
  });

  it("requires both material and conversion method for printed estimates", () => {
    expect(buildExternalAssessment({ ...input, origin: "printed_estimate", material: "   ", conversionMethod: "Tabela" }, "invalid")).toEqual({ ok: false, error: "Informe o material da estimativa impressa." });
    expect(buildExternalAssessment({ ...input, origin: "printed_estimate", material: "Caderno", conversionMethod: "   " }, "invalid")).toEqual({ ok: false, error: "Informe o método de conversão da estimativa impressa." });
  });

  it("accepts each text limit and rejects one extra character after trimming", () => {
    const printed: ExternalAssessmentInput = { ...input, origin: "printed_estimate", material: "Caderno", conversionMethod: "Tabela" };
    const limits = { title: 120, material: 160, conversionMethod: 300, notes: 2_000 } as const;
    for (const [field, limit] of Object.entries(limits)) {
      expect(buildExternalAssessment({ ...printed, [field]: `  ${"x".repeat(limit)}  ` }, "valid"), field).toMatchObject({ ok: true });
      expect(buildExternalAssessment({ ...printed, [field]: "x".repeat(limit + 1) }, "invalid"), field).toMatchObject({ ok: false });
    }
  });
});
