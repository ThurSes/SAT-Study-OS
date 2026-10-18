import "server-only";
import type { DashboardData, Question, SimulatorPlan, Skill } from "@/types/domain";

// Original, synthetic development data. Never imported by visual components.
const skills: readonly Skill[] = [
  { id: "3811ef86-8bf0-41cf-a301-600e20d54e01", section: "rw", domain: "information-and-ideas", name: "Inferências" },
  { id: "3811ef86-8bf0-41cf-a301-600e20d54e02", section: "rw", domain: "craft-and-structure", name: "Palavras em contexto" },
  { id: "3811ef86-8bf0-41cf-a301-600e20d54e03", section: "rw", domain: "expression-of-ideas", name: "Transições" },
  { id: "3811ef86-8bf0-41cf-a301-600e20d54e04", section: "rw", domain: "standard-english-conventions", name: "Limites entre orações" },
];

const provenance = { kind: "original-development", author: "SAT Study OS — conteúdo original de desenvolvimento" } as const;

export const questions: readonly Question[] = [
  {
    id: "bb5d789f-5ae6-4670-a301-600e20d54e01", version: 1,
    section: "rw", skillId: skills[0].id, difficulty: "medium", format: "multiple-choice", language: "en", provenance,
    passage: "In a coastal town, researchers planted native grasses on two sections of a damaged dune. One section was fenced to keep visitors off the young plants; the other remained open. After a year, the fenced section had denser vegetation, although both sections had received similar amounts of rain. The researchers noted that roots help hold sand in place, but that newly planted grasses are easily damaged by foot traffic.",
    prompt: "Which finding, if true, would most directly support the researchers’ explanation for the difference between the two sections?",
    options: [
      { id: "a", label: "A", text: "The fenced section experienced fewer instances of plants being stepped on than the open section did." },
      { id: "b", label: "B", text: "The two sections were planted with the same number of native grass species." },
      { id: "c", label: "C", text: "Visitors preferred to visit the beach in summer rather than in winter." },
      { id: "d", label: "D", text: "Some native grasses can grow in coastal towns with less annual rainfall." },
    ],
  },
  {
    id: "bb5d789f-5ae6-4670-a301-600e20d54e02", version: 1,
    section: "rw", skillId: skills[1].id, difficulty: "easy", format: "multiple-choice", language: "en", provenance,
    passage: "While studying old maps of the valley, geographer Lina Costa noticed that a narrow stream appeared in records from several different decades. Its course was remarkably consistent: despite changes to nearby roads and farms, the stream followed almost exactly the same path.",
    prompt: "As used in the text, “consistent” most nearly means",
    options: [
      { id: "a", label: "A", text: "persuasive." }, { id: "b", label: "B", text: "unchanging." },
      { id: "c", label: "C", text: "unexpected." }, { id: "d", label: "D", text: "complex." },
    ],
  },
  {
    id: "bb5d789f-5ae6-4670-a301-600e20d54e03", version: 1,
    section: "rw", skillId: skills[2].id, difficulty: "medium", format: "multiple-choice", language: "en", provenance,
    passage: "Most of the seedlings in a greenhouse grew slowly during the first week of an experiment. One group, however, received additional light each evening. ______ these seedlings grew nearly twice as tall as the others by the end of the week.",
    prompt: "Which choice completes the text with the most logical transition?",
    options: [
      { id: "a", label: "A", text: "Nevertheless," }, { id: "b", label: "B", text: "For instance," },
      { id: "c", label: "C", text: "As a result," }, { id: "d", label: "D", text: "In contrast to this result," },
    ],
  },
  {
    id: "bb5d789f-5ae6-4670-a301-600e20d54e04", version: 1,
    section: "rw", skillId: skills[3].id, difficulty: "medium", format: "multiple-choice", language: "en", provenance,
    passage: "A community archive preserves recordings of local musicians ______ volunteers also maintain written descriptions of each performance.",
    prompt: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    options: [
      { id: "a", label: "A", text: "and," }, { id: "b", label: "B", text: "," },
      { id: "c", label: "C", text: ";" }, { id: "d", label: "D", text: "because," },
    ],
  },
  {
    id: "bb5d789f-5ae6-4670-a301-600e20d54e05", version: 1,
    section: "rw", skillId: skills[0].id, difficulty: "hard", format: "multiple-choice", language: "en", provenance,
    passage: "A city library extended its evening opening hours for three months. During that period, evening attendance increased, but the total number of weekly visits remained approximately the same. A librarian suggested that many visitors had changed the time of their visits rather than begun visiting more often.",
    prompt: "Which statement is best supported by the information in the text?",
    options: [
      { id: "a", label: "A", text: "The extended hours caused all daytime visitors to stop using the library." },
      { id: "b", label: "B", text: "The library’s collection became less popular during the three-month period." },
      { id: "c", label: "C", text: "Evening visitors borrowed more books per visit than daytime visitors did." },
      { id: "d", label: "D", text: "The increase in evening attendance did not necessarily represent an increase in weekly visits." },
    ],
  },
];

export const simulatorPlan: SimulatorPlan = {
  id: "cd92ed31-a819-4aaf-9291-c283b13c8485", title: "Sessão curta experimental",
  section: "rw", durationSeconds: 300, adaptive: false,
  questions: questions.map(({ id, version }) => ({ id, version })),
};

export const dashboardData: DashboardData = {
  studentName: "Estudante", targetScore: 1450,
  dateLabel: "18 de outubro de 2026 · cenário de exemplo",
  nextActivity: { title: "Uma leitura atenta.\nUm passo à frente.", reason: "Explore cinco questões de Reading and Writing e pratique encontrar a evidência que sustenta uma resposta.", minutes: 5, href: "/simulador" },
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

export function getDevelopmentData() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Dados de desenvolvimento indisponíveis neste ambiente.");
  }
  return { dashboardData, questions, simulatorPlan, skills };
}
