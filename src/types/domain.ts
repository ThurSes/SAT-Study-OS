/** Canonical domain contracts. Answer keys never belong in browser-facing data. */
export type SatSection = "rw" | "math";
export type SatDomain =
  | "information-and-ideas" | "craft-and-structure" | "expression-of-ideas"
  | "standard-english-conventions" | "algebra" | "advanced-math"
  | "problem-solving-and-data-analysis" | "geometry-and-trigonometry";

export interface Skill {
  readonly id: string;
  readonly section: SatSection;
  readonly domain: SatDomain;
  readonly name: string;
}

export interface QuestionRef {
  readonly id: string;
  readonly version: number;
}

export interface QuestionOption {
  readonly id: string;
  readonly label: string;
  readonly text: string;
}

export interface Question extends QuestionRef {
  readonly skillId: Skill["id"];
  readonly section: SatSection;
  readonly difficulty: "easy" | "medium" | "hard";
  readonly format: "multiple-choice";
  readonly passage?: string;
  readonly prompt: string;
  readonly language: "en";
  readonly options: readonly QuestionOption[];
  readonly provenance: { readonly kind: "original-development"; readonly author: string };
}

export interface SimulatorPlan {
  readonly id: string;
  readonly title: string;
  readonly section: SatSection;
  readonly durationSeconds: number;
  readonly questions: readonly QuestionRef[];
  readonly adaptive: false;
}

export interface Answer {
  readonly question: QuestionRef;
  readonly optionId: string | null;
  readonly markedForReview: boolean;
}

export type AssessmentResult = {
  readonly id: string;
  readonly date: string;
  readonly title: string;
  readonly notes?: string;
} & (
  | { readonly origin: "official_self_reported"; readonly readingWriting: number; readonly math: number }
  | { readonly origin: "printed_estimate"; readonly readingWriting: number; readonly math: number; readonly material: string; readonly conversionMethod: string }
  | { readonly origin: "experimental"; readonly correct: number; readonly total: number; readonly durationSeconds: number | null }
);

export interface StudyPlanItem {
  readonly id: string;
  readonly userId: string;
  readonly skillId: Skill["id"];
  readonly title: string;
  readonly date: string;
  readonly time: string;
  readonly durationMinutes: number;
  readonly status: "planned" | "in_progress" | "completed";
  readonly personalDifficulty: "low" | "medium" | "high" | null;
  readonly notes: string;
  readonly resource: { readonly label: string; readonly href: string } | null;
}

/** Completed, separate attempts only. Never attach solutions to an active question payload. */
export interface ErrorRecord {
  readonly id: string;
  readonly userId: string;
  readonly attemptId: string;
  readonly question: QuestionRef;
  readonly skillId: Skill["id"];
  readonly questionText: string;
  readonly givenAnswer: string;
  readonly correctAnswer: string;
  readonly explanation: string;
  readonly cause: "concept" | "reading" | "calculation" | "time" | "guess" | "unknown";
  readonly reflection: string;
  readonly reviewDueDate: string;
  readonly reviews: readonly { readonly id: string; readonly reviewedAt: string }[];
}

export interface DashboardData {
  readonly studentName: string;
  readonly targetScore: number | null;
  readonly dateLabel: string;
  readonly nextActivity: { readonly title: string; readonly reason: string; readonly minutes: number; readonly href: string };
  readonly agenda: readonly { readonly id: string; readonly time: string; readonly title: string; readonly detail: string }[];
  readonly performance: readonly { readonly skill: Skill; readonly correct: number; readonly total: number }[];
  readonly history: readonly AssessmentResult[];
}
