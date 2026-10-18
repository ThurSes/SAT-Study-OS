import type { StudyPlanItem } from "@/types/domain";

export const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function isCivilDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
export function validStudy(value: StudyPlanItem, skillIds: ReadonlySet<string>): boolean {
  if (!value || !isUuid(value.id) || !skillIds.has(value.skillId) || typeof value.title !== "string" || !value.title.trim() || value.title.length > 160) return false;
  if (!isCivilDate(value.date) || typeof value.time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)) return false;
  if (!Number.isInteger(value.durationMinutes) || value.durationMinutes < 1 || value.durationMinutes > 1440 || !["planned", "in_progress", "completed"].includes(value.status)) return false;
  if (typeof value.notes !== "string" || value.notes.length > 4000 || ![null, "low", "medium", "high"].includes(value.personalDifficulty)) return false;
  if (value.resource !== null) {
    if (!value.resource || typeof value.resource.label !== "string" || !value.resource.label.trim() || value.resource.label.length > 160 || typeof value.resource.href !== "string" || value.resource.href.length > 2048) return false;
    const href = value.resource.href;
    if (href.startsWith("/") && !href.startsWith("//") && !/[\\\r\n]/.test(href)) return true;
    try { if (!["https:", "http:"].includes(new URL(href).protocol)) return false; } catch { return false; }
  }
  return true;
}
