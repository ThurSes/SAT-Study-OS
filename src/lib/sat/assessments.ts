import type { AssessmentResult } from "../../types/domain";

export interface ExternalAssessmentInput {
  title: string;
  date: string;
  origin: string;
  readingWriting: string;
  math: string;
  material: string;
  conversionMethod: string;
  notes: string;
}

export type ExternalAssessmentResult = Extract<AssessmentResult, {
  origin: "official_self_reported" | "bluebook_self_reported" | "printed_estimate";
}>;

function isCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= monthDays[month - 1];
}

function parseSectionScore(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const score = Number(trimmed);
  return score >= 200 && score <= 800 ? score : null;
}

/** Builds a local record only; the caller supplies its identifier. */
export function buildExternalAssessment(
  input: ExternalAssessmentInput,
  id: string,
): { ok: true; assessment: ExternalAssessmentResult } | { ok: false; error: string } {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Informe o título do resultado." };
  if (title.length > 120) return { ok: false, error: "O título deve ter até 120 caracteres." };

  const date = input.date.trim();
  if (!isCivilDate(date)) return { ok: false, error: "Informe uma data válida no formato AAAA-MM-DD." };
  if (input.origin !== "official_self_reported" && input.origin !== "bluebook_self_reported" && input.origin !== "printed_estimate") {
    return { ok: false, error: "Selecione resultado oficial autodeclarado ou estimativa impressa." };
  }

  const readingWriting = parseSectionScore(input.readingWriting);
  if (readingWriting === null) {
    return { ok: false, error: "Reading and Writing deve ser um número inteiro entre 200 e 800." };
  }
  const math = parseSectionScore(input.math);
  if (math === null) return { ok: false, error: "Math deve ser um número inteiro entre 200 e 800." };

  const notes = input.notes.trim();
  if (notes.length > 2_000) return { ok: false, error: "As notas devem ter até 2000 caracteres." };
  const common = { id, title, date, readingWriting, math, ...(notes ? { notes } : {}) };

  if (input.origin === "official_self_reported" || input.origin === "bluebook_self_reported") {
    return { ok: true, assessment: { ...common, origin: input.origin } };
  }

  const material = input.material.trim();
  if (!material) return { ok: false, error: "Informe o material da estimativa impressa." };
  if (material.length > 160) return { ok: false, error: "O material deve ter até 160 caracteres." };
  const conversionMethod = input.conversionMethod.trim();
  if (!conversionMethod) return { ok: false, error: "Informe o método de conversão da estimativa impressa." };
  if (conversionMethod.length > 300) return { ok: false, error: "O método de conversão deve ter até 300 caracteres." };

  return {
    ok: true,
    assessment: { ...common, origin: "printed_estimate", material, conversionMethod },
  };
}
