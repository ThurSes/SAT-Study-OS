import type { ExamAnswer, ExamCommand, ExamPhase } from "@/types/domain";

export const EXAM_RULE_VERSION = "adaptive-2026-10-v1";
export const EXAM_TIMELINE: readonly { phase: ExamPhase; starts: number; ends: number }[] = [
  { phase: "rw1", starts: 0, ends: 1920 }, { phase: "rw2", starts: 1920, ends: 3840 },
  { phase: "break", starts: 3840, ends: 4440 }, { phase: "math1", starts: 4440, ends: 6540 },
  { phase: "math2", starts: 6540, ends: 8640 },
];
export const EMPTY_EXAM_ANSWER: ExamAnswer = { value: null, marked: false, eliminated: [], notes: "", annotations: [], observedMs: 0 };
export function examPhase(start: number, now: number): ExamPhase | "completed" {
  return EXAM_TIMELINE.find(part => now < start + part.ends * 1000)?.phase ?? "completed";
}
export function adaptiveRoute(correct: number, scored: number): "lower" | "higher" {
  if (!Number.isInteger(correct) || !Number.isInteger(scored) || scored <= 0 || correct < 0 || correct > scored) throw new Error("Invalid routing counts");
  return correct * 100 >= scored * 65 ? "higher" : "lower";
}
/** Exact rational normalization, no eval, float tolerance or mixed numbers. */
export function numericRational(raw: string): readonly [bigint, bigint] | null {
  if (!raw || raw.length > (raw.startsWith("-") ? 6 : 5) || !/^-?(?:\d+(?:\.\d*)?|\.\d+|\d+\/\d+)$/.test(raw)) return null;
  if (raw.includes("/")) { const [n, d] = raw.split("/").map(BigInt); return d === BigInt(0) ? null : [n, d]; }
  const decimals = raw.split(".")[1]?.length ?? 0;
  return [BigInt(raw.replace(".", "")), BigInt(10) ** BigInt(decimals)];
}
export function numericEqual(answer: string, accepted: readonly string[]): boolean {
  const a = numericRational(answer);
  return !!a && accepted.some(value => { const b = numericRational(value); return !!b && a[0] * b[1] === b[0] * a[1]; });
}
const uuid = (s: unknown) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
export function validExamCommand(value: unknown): value is ExamCommand {
  if (!value || typeof value !== "object") return false;
  const v = value as ExamCommand;
  if (!uuid(v.requestId) || !["start", "sync", "save", "abandon", "calculator"].includes(v.operation)) return false;
  if (v.attemptId !== undefined && !uuid(v.attemptId)) return false;
  if (["save", "abandon", "calculator"].includes(v.operation) && (!uuid(v.attemptId) || !Number.isInteger(v.expectedRevision) || v.expectedRevision! < 0)) return false;
  if (v.operation === "calculator") return !!v.calculator && typeof v.calculator === "object" && JSON.stringify(v.calculator).length <= 100_000;
  if (v.operation !== "save") return true;
  const a = v.answer;
  return uuid(v.questionId) && !!a && (a.value === null || typeof a.value === "string" && a.value.length <= 100) && typeof a.marked === "boolean" &&
    Array.isArray(a.eliminated) && a.eliminated.length <= 4 && a.eliminated.every(x => typeof x === "string" && x.length <= 100) &&
    typeof a.notes === "string" && a.notes.length <= 4000 && Number.isInteger(a.observedMs) && a.observedMs >= 0 && a.observedMs <= 2_100_000 &&
    Array.isArray(a.annotations) && a.annotations.length <= 100 && a.annotations.every(x => x && typeof x.blockId === "string" && x.blockId.length <= 100 &&
      Number.isInteger(x.start) && Number.isInteger(x.end) && x.start >= 0 && x.end > x.start && x.end <= 100_000 && ["highlight", "underline"].includes(x.style));
}
