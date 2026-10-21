"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mapError } from "@/lib/supabase/workspace";
import { buildExternalAssessment } from "@/lib/sat/assessments";
import { isUuid, validStudy } from "./validation";
import { questionSkills, questions } from "@/features/questions/catalog";
import { lessons, contentSkills } from "@/features/content/content-catalog";
import type { AssessmentResult, ErrorCause, ErrorRecord, LessonProgress, PracticeFeedback, PracticeSubmission, SaveResult, StudyPlanItem } from "@/types/domain";

async function authenticated() {
  const db = await createClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new Error("Entre novamente para salvar seus estudos.");
  return { db, user: data.user };
}
function failed<T>(): SaveResult<T> { return { ok: false, error: "Não foi possível confirmar a gravação. Seus campos foram preservados; tente novamente. Se sua sessão expirou, entre novamente." }; }
function refresh() { revalidatePath("/", "layout"); }

export async function saveStudyItem(input: StudyPlanItem): Promise<SaveResult<StudyPlanItem>> {
  if (!validStudy(input, new Set([...questionSkills, ...contentSkills].map(skill => skill.id)))) return { ok: false, error: "Revise os dados da atividade. Use duração de 1 a 1440 minutos, data e recurso válidos." };
  try {
    const { db, user } = await authenticated();
    const value: StudyPlanItem = { id: input.id, userId: user.id, title: input.title.trim(), skillId: input.skillId, date: input.date, time: input.time, durationMinutes: input.durationMinutes, status: input.status, personalDifficulty: input.personalDifficulty, notes: input.notes.trim(), resource: input.resource };
    const { data, error } = await db.from("sat_study_items").upsert({ id: value.id, user_id: user.id, payload: value, updated_at: new Date().toISOString() }).select("payload").single();
    if (error || !data) return failed();
    refresh(); return { ok: true, value: data.payload as StudyPlanItem };
  } catch { return failed(); }
}

export async function saveAssessment(input: AssessmentResult): Promise<SaveResult<AssessmentResult>> {
  if (!input || !isUuid(input.id) || input.origin === "experimental") return { ok: false, error: "Avaliação externa inválida." };
  if (typeof input.title !== "string" || typeof input.date !== "string" || (input.notes !== undefined && typeof input.notes !== "string") || !["official_self_reported", "bluebook_self_reported", "printed_estimate"].includes(input.origin) || (input.origin === "printed_estimate" && (typeof input.material !== "string" || typeof input.conversionMethod !== "string"))) return { ok: false, error: "Revise os campos da avaliação." };
  const validated = buildExternalAssessment({ title: input.title, date: input.date, origin: input.origin, readingWriting: String(input.readingWriting), math: String(input.math), material: input.origin === "printed_estimate" ? input.material : "", conversionMethod: input.origin === "printed_estimate" ? input.conversionMethod : "", notes: input.notes || "" }, input.id);
  if (!validated.ok) return { ok: false, error: validated.error };
  try {
    const { db, user } = await authenticated();
    const { data, error } = await db.from("sat_assessments").upsert({ id: input.id, user_id: user.id, payload: validated.assessment }).select("payload").single();
    if (error || !data) return failed();
    refresh(); return { ok: true, value: data.payload as AssessmentResult };
  } catch { return failed(); }
}

export async function saveLessonProgress(input: LessonProgress): Promise<SaveResult<LessonProgress>> {
  if (!input || !lessons.some(lesson => lesson.id === input.lessonId) || typeof input.completed !== "boolean" || typeof input.notes !== "string" || input.notes.length > 4000) return { ok: false, error: "Aula ou anotação inválida (limite de 4000 caracteres)." };
  try {
    const { db, user } = await authenticated();
    const { data, error } = await db.from("sat_lesson_progress").upsert({ user_id: user.id, lesson_id: input.lessonId, completed: input.completed, notes: input.notes.trim(), updated_at: new Date().toISOString() }).select("lesson_id,completed,notes").single();
    if (error || !data) return failed();
    refresh(); return { ok: true, value: { lessonId: data.lesson_id, completed: data.completed, notes: data.notes } };
  } catch { return failed(); }
}

export async function submitPracticeAnswer(input: PracticeSubmission): Promise<SaveResult<PracticeFeedback>> {
  if (!input || !isUuid(input.requestId) || !input.question || !questions.some(question => question.id === input.question.id && question.version === input.question.version && question.options.some(option => option.id === input.optionId))) return { ok: false, error: "Selecione uma alternativa válida desta questão." };
  try {
    const { db } = await authenticated();
    const { data, error } = await db.rpc("sat_submit_practice", { p_request_id: input.requestId, p_question_id: input.question.id, p_version: input.question.version, p_option_id: input.optionId });
    if (error || !data) return failed();
    refresh(); return { ok: true, value: data as PracticeFeedback };
  } catch { return failed(); }
}

async function readError(db: Awaited<ReturnType<typeof createClient>>, userId: string, id: string): Promise<ErrorRecord | null> {
  const [record, reviews] = await Promise.all([
    db.from("sat_errors").select("*").eq("id", id).eq("user_id", userId).single(),
    db.from("sat_error_reviews").select("id,error_id,reviewed_at").eq("error_id", id).eq("user_id", userId).order("reviewed_at"),
  ]);
  return record.error || reviews.error ? null : mapError(record.data, reviews.data || []);
}

export async function saveErrorReflection(id: string, cause: ErrorCause, reflection: string): Promise<SaveResult<ErrorRecord>> {
  if (!isUuid(id) || !["concept", "reading", "attention", "unknown"].includes(cause) || typeof reflection !== "string" || reflection.length > 2000) return { ok: false, error: "Escolha interpretação, conteúdo ou falta de atenção e use até 2000 caracteres." };
  try {
    const { db, user } = await authenticated();
    const { data, error } = await db.from("sat_errors").update({ cause, reflection: reflection.trim() }).eq("id", id).eq("user_id", user.id).select("id").single();
    if (error || !data) return failed();
    const value = await readError(db, user.id, id);
    if (!value) return failed();
    refresh(); return { ok: true, value };
  } catch { return failed(); }
}

export async function reviewError(id: string, eventId: string): Promise<SaveResult<ErrorRecord>> {
  if (!isUuid(id) || !isUuid(eventId)) return { ok: false, error: "Registro de revisão inválido." };
  try {
    const { db, user } = await authenticated();
    const { error } = await db.rpc("sat_review_error", { p_error_id: id, p_event_id: eventId });
    if (error) return failed();
    const value = await readError(db, user.id, id);
    if (!value) return failed();
    refresh(); return { ok: true, value };
  } catch { return failed(); }
}
