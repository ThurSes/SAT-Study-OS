import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient, getIdentity } from "./server";
import type { AssessmentResult, DashboardData, ErrorRecord, LessonProgress, StudyPlanItem } from "@/types/domain";
import { questionSkills } from "@/features/questions/catalog";
import { toStudyDate } from "@/lib/format-date";

interface ErrorRow {
  id: string; user_id: string; attempt_id: string; question_id: string; question_version: number;
  skill_id: string; question_text: string; given_answer: string; correct_answer: string; explanation: string;
  cause: ErrorRecord["cause"]; reflection: string; review_due_date: string;
}
interface ReviewRow { id: string; error_id: string; reviewed_at: string }

export function mapError(row: ErrorRow, reviews: readonly ReviewRow[] = []): ErrorRecord {
  return { id: row.id, userId: row.user_id, attemptId: row.attempt_id, question: { id: row.question_id, version: row.question_version },
    skillId: row.skill_id, questionText: row.question_text, givenAnswer: row.given_answer, correctAnswer: row.correct_answer,
    explanation: row.explanation, cause: row.cause, reflection: row.reflection, reviewDueDate: row.review_due_date,
    reviews: reviews.filter(review => review.error_id === row.id).map(review => ({ id: review.id, reviewedAt: review.reviewed_at })) };
}

export const getOptionalWorkspace = cache(async () => {
  const user = await getIdentity();
  if (!user) return null;
  const db = await createClient();
  const queries = await Promise.all([
    db.from("sat_profiles").select("name,target_score").eq("id", user.id).maybeSingle(),
    db.from("sat_study_items").select("payload").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(500),
    db.from("sat_assessments").select("payload").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500),
    db.from("sat_lesson_progress").select("lesson_id,completed,notes").eq("user_id", user.id).limit(500),
    db.from("sat_errors").select("*").eq("user_id", user.id).order("review_due_date").limit(500),
    db.from("sat_error_reviews").select("id,error_id,reviewed_at").eq("user_id", user.id).order("reviewed_at").limit(2000),
    db.from("sat_practice_attempts").select("id,skill_id,correct,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500),
  ]);
  if (queries.some(query => query.error)) throw new Error("Não foi possível carregar seus estudos. Confira a conexão e a aplicação das migrations do Supabase.");
  const [profile, studies, assessments, lessons, errors, reviews, practice] = queries;
  const studyItems = (studies.data || []).map(row => row.payload as StudyPlanItem);
  const lessonProgress: LessonProgress[] = (lessons.data || []).map(row => ({ lessonId: row.lesson_id, completed: row.completed, notes: row.notes }));
  const errorRecords = (errors.data || []).map(row => mapError(row as ErrorRow, reviews.data as ReviewRow[]));
  const history: AssessmentResult[] = [...(assessments.data || []).map(row => row.payload as AssessmentResult),
    ...(practice.data || []).map(row => ({ id: row.id, date: toStudyDate(row.created_at), title: "Prática individual", origin: "experimental" as const, correct: row.correct ? 1 : 0, total: 1, durationSeconds: null }))];
  const referenceDate = toStudyDate(new Date());
  const nextItem = studyItems.filter(item => item.status !== "completed").toSorted((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];
  const dashboardData: DashboardData = {
    studentName: String(profile.data?.name || user.user_metadata.name || "Estudante").slice(0, 80), targetScore: profile.data?.target_score ?? null,
    dateLabel: new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(new Date()),
    nextActivity: nextItem ? { title: nextItem.title, reason: "Continue uma atividade do seu plano de estudos.", minutes: nextItem.durationMinutes, href: "/estudos" } : { title: "Uma ideia nova.\nUm passo à frente.", reason: "Explore conteúdos, leia um exemplo resolvido e organize sua primeira atividade.", minutes: 15, href: "/conteudos" },
    agenda: studyItems.filter(item => item.date === referenceDate && item.status !== "completed").toSorted((a, b) => a.time.localeCompare(b.time)).map(item => ({ id: item.id, title: item.title, time: item.time, detail: `${item.durationMinutes} min` })),
    performance: questionSkills.flatMap(skill => { const rows = (practice.data || []).filter(row => row.skill_id === skill.id); return rows.length ? [{ skill, correct: rows.filter(row => row.correct).length, total: rows.length }] : []; }),
    history: history.toSorted((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
  };
  return { user, studyItems, lessonProgress, errorRecords, history, referenceDate, dashboardData };
});

export async function requireWorkspace() {
  const workspace = await getOptionalWorkspace();
  if (!workspace) redirect("/login");
  return workspace;
}
