import "server-only";
import type { DashboardData, ErrorRecord, StudyPlanItem } from "@/types/domain";

import { questions, simulatorPlan, questionSkills as skills } from "@/features/questions/catalog";

// Synthetic personal records remain development-only. The original question catalogue is shared.
export const dashboardData: DashboardData = {
  studentName: "Estudante", targetScore: 1450,
  dateLabel: "18 de outubro de 2026 · cenário de exemplo",
  nextActivity: { title: "Uma leitura atenta.\nUm passo à frente.", reason: "Explore cinco questões de Reading and Writing e pratique encontrar a evidência que sustenta uma resposta.", minutes: 5, href: "/simulador/treino" },
  agenda: [
    { id: "d86655ce-a301-4900-aea0-f020bc580001", time: "09:00", title: "Leitura com intenção", detail: "Reading and Writing · 20 min" },
    { id: "d86655ce-a301-4900-aea0-f020bc580002", time: "14:00", title: "Revisitar o raciocínio", detail: "Revisão de anotações · 15 min" },
  ],
  performance: [
    { skill: skills[0], correct: 6, total: 10 },
    { skill: skills[1], correct: 9, total: 12 },
    { skill: skills[2], correct: 4, total: 5 },
    { skill: { id: "3811ef86-8bf0-41cf-a301-600e20d54e05", section: "math", domain: "algebra", name: "Equações lineares" }, correct: 11, total: 15 },
  ],
  history: [
    { id: "670c1729-a301-4301-bc92-4c604a970001", date: "2026-10-17", title: "Leitura e evidências", origin: "experimental", correct: 7, total: 10, durationSeconds: 600 },
    { id: "670c1729-a301-4301-bc92-4c604a970002", date: "2026-10-14", title: "Avaliação informada", origin: "official_self_reported", readingWriting: 640, math: 690 },
    { id: "670c1729-a301-4301-bc92-4c604a970003", date: "2026-10-10", title: "Prática em papel", origin: "printed_estimate", readingWriting: 620, math: 680, material: "Caderno sintético de desenvolvimento, edição 1", conversionMethod: "Valores sintéticos de exemplo; nenhuma conversão aplicada." },
  ],
};

const developmentUserId = "41cd53a8-cf66-4d7a-8d25-f053046759c7";
const referenceDate = "2026-10-18";

const studyItems: readonly StudyPlanItem[] = [
  { id: "d86655ce-a301-4900-aea0-f020bc580001", userId: developmentUserId, skillId: skills[0].id, title: "Leitura com intenção", date: referenceDate, time: "09:00", durationMinutes: 20, status: "planned", personalDifficulty: "high", notes: "Destaque a evidência antes de escolher uma alternativa.", resource: { label: "Explorar questões de leitura", href: "/questoes" } },
  { id: "d86655ce-a301-4900-aea0-f020bc580002", userId: developmentUserId, skillId: skills[3].id, title: "Revisitar o raciocínio", date: referenceDate, time: "14:00", durationMinutes: 15, status: "in_progress", personalDifficulty: "medium", notes: "Releia os registros de tentativas concluídas no diário de erros.", resource: { label: "Abrir diário de erros", href: "/erros" } },
  { id: "d86655ce-a301-4900-aea0-f020bc580003", userId: developmentUserId, skillId: skills[4].id, title: "Equações, passo a passo", date: "2026-10-19", time: "10:30", durationMinutes: 30, status: "planned", personalDifficulty: "medium", notes: "Escreva a mesma operação dos dois lados da equação.", resource: null },
  { id: "d86655ce-a301-4900-aea0-f020bc580004", userId: developmentUserId, skillId: skills[2].id, title: "Conectar ideias", date: "2026-10-20", time: "09:00", durationMinutes: 20, status: "planned", personalDifficulty: "low", notes: "Identifique a relação entre as frases: causa, contraste ou exemplo.", resource: { label: "Explorar banco de questões", href: "/questoes" } },
  { id: "d86655ce-a301-4900-aea0-f020bc580005", userId: developmentUserId, skillId: skills[1].id, title: "Palavras em contexto", date: "2026-10-17", time: "09:00", durationMinutes: 20, status: "completed", personalDifficulty: "medium", notes: "Atividade concluída no cenário de exemplo; não é histórico de uso real.", resource: null },
];

// These completed synthetic attempts use distinct logical question IDs from the active catalogue.
const errorRecords: readonly ErrorRecord[] = [
  {
    id: "f2011640-b30a-4eaa-8dd3-5bb2e186aa01", userId: developmentUserId,
    attemptId: "62b0f1be-86ba-4e42-bf6f-c9935843aa01", question: { id: "7c9a3040-ea99-4ac0-ac1b-e4e254b2fa01", version: 1 }, skillId: skills[0].id,
    questionText: "A researcher found more bees near gardens containing several native flower species than near gardens containing a single flower species. Which observation would best support the idea that plant variety benefits bees?",
    givenAnswer: "The gardens were located in the same city.",
    correctAnswer: "The diverse gardens offered flowering plants during more months of the year.",
    explanation: "A supply of flowers across more months provides a mechanism linking plant variety to the availability of food. A shared location does not explain the difference in bee activity.",
    cause: "reading", reflection: "Escolhi uma informação verdadeira, mas que não sustentava a hipótese.", reviewDueDate: "2026-10-17", reviews: [],
  },
  {
    id: "f2011640-b30a-4eaa-8dd3-5bb2e186aa02", userId: developmentUserId,
    attemptId: "62b0f1be-86ba-4e42-bf6f-c9935843aa02", question: { id: "7c9a3040-ea99-4ac0-ac1b-e4e254b2fa02", version: 1 }, skillId: skills[4].id,
    questionText: "If 3x + 7 = 22, what is the value of x?",
    givenAnswer: "29/3", correctAnswer: "5",
    explanation: "Subtract 7 from both sides to get 3x = 15. Divide both sides by 3 to get x = 5. Substituting gives 3(5) + 7 = 22.",
    cause: "attention", reflection: "Somei 7 em vez de subtrair. Conferir por substituição.", reviewDueDate: referenceDate, reviews: [],
  },
  {
    id: "f2011640-b30a-4eaa-8dd3-5bb2e186aa03", userId: developmentUserId,
    attemptId: "62b0f1be-86ba-4e42-bf6f-c9935843aa03", question: { id: "7c9a3040-ea99-4ac0-ac1b-e4e254b2fa03", version: 1 }, skillId: skills[3].id,
    questionText: "The workshop opened in March _____ its first exhibition began in April. Choose the punctuation that correctly joins these independent clauses.",
    givenAnswer: "a comma", correctAnswer: "a semicolon",
    explanation: "Both parts can stand as complete sentences. A semicolon can join closely related independent clauses; a comma alone would create a comma splice.",
    cause: "concept", reflection: "Reconhecer duas orações independentes antes de escolher a pontuação.", reviewDueDate: "2026-10-20", reviews: [{ id: "c49c790f-c769-4b41-9af4-02a444d1f003", reviewedAt: "2026-10-16T15:00:00Z" }],
  },
];

export function getDevelopmentData() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Dados de desenvolvimento indisponíveis neste ambiente.");
  }
  return { dashboardData, questions, simulatorPlan, skills, studyItems, errorRecords, referenceDate, developmentUserId };
}
