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
  readonly provenance: { readonly kind: "original-development" | "original"; readonly author: string };
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
  | { readonly origin: "official_self_reported" | "bluebook_self_reported"; readonly readingWriting: number; readonly math: number }
  | { readonly origin: "printed_estimate"; readonly readingWriting: number; readonly math: number; readonly material: string; readonly conversionMethod: string }
  | { readonly origin: "experimental"; readonly correct: number; readonly total: number; readonly durationSeconds: number | null; readonly examAttemptId?: string }
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
  readonly cause: "concept" | "reading" | "attention" | "unknown";
  readonly reflection: string;
  readonly reviewDueDate: string;
  readonly reviews: readonly { readonly id: string; readonly reviewedAt: string }[];
}

export interface StudyLesson {
  readonly id: string;
  readonly skill: Skill;
  readonly title: string;
  readonly minutes: number;
  readonly objectives: readonly string[];
  readonly explanation: readonly string[];
  readonly example: { readonly prompt: string; readonly steps: readonly string[]; readonly answer: string };
  readonly pitfalls: readonly string[];
}

export interface LessonProgress {
  readonly lessonId: string;
  readonly completed: boolean;
  readonly notes: string;
}

export type SaveResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

export type ErrorCause = ErrorRecord["cause"];
export interface PracticeSubmission {
  readonly requestId: string;
  readonly question: QuestionRef;
  readonly optionId: string;
}
export interface PracticeFeedback {
  readonly attemptId: string;
  readonly correct: boolean;
  readonly correctAnswer: string;
  readonly explanation: string;
  readonly errorId: string | null;
}

export interface StoredSimulatorSession {
  readonly revision: number;
  readonly status: "idle" | "running" | "paused" | "expired";
  readonly answers: Readonly<Record<string, Answer>>;
  readonly remainingMs: number;
  readonly deadline: string | null;
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

/** Adaptive exam contracts. No key, route decision or pretest flag in active payloads. */
export type ExamPhase = "rw1" | "rw2" | "break" | "math1" | "math2";
export type ExamBlock =
  | { readonly id: string; readonly type: "text"; readonly text: string }
  | { readonly id: string; readonly type: "math"; readonly latex: string }
  | { readonly id: string; readonly type: "image"; readonly src: string; readonly alt: string }
  | { readonly id: string; readonly type: "table"; readonly headers: readonly string[]; readonly rows: readonly (readonly string[])[] };
export interface ExamQuestion extends QuestionRef {
  readonly section: SatSection;
  readonly domain: SatDomain;
  readonly skillId: string;
  readonly difficulty: "easy" | "medium" | "hard";
  readonly format: "multiple-choice" | "numeric";
  readonly passage: readonly ExamBlock[];
  readonly content: readonly ExamBlock[];
  readonly options: readonly { readonly id: string; readonly label: string; readonly content: readonly ExamBlock[] }[];
  readonly provenance: { readonly kind: "personal-pdf" | "original"; readonly label: string; readonly sourceTest?: number; readonly page?: number };
  readonly previouslySeen: boolean;
}
export interface ExamAnnotation { readonly blockId: string; readonly start: number; readonly end: number; readonly style: "highlight" | "underline" }
export interface ExamAnswer {
  readonly value: string | null;
  readonly marked: boolean;
  readonly eliminated: readonly string[];
  readonly notes: string;
  readonly annotations: readonly ExamAnnotation[];
  readonly observedMs: number;
}
export interface ExamAvailability {
  readonly ready: boolean;
  readonly reviewedCount: number;
  readonly reason: string | null;
}
export interface ExamReviewItem {
  readonly question: ExamQuestion;
  readonly answer: ExamAnswer;
  readonly correct: boolean;
  readonly scored: boolean;
  readonly correctAnswer: string;
  readonly explanation: string;
  readonly phase: Exclude<ExamPhase, "break">;
}
export interface ExamResult {
  readonly correct: number;
  readonly total: number;
  readonly blank: number;
  readonly observedMs: number;
  readonly sections: readonly { readonly section: SatSection; readonly correct: number; readonly total: number; readonly route: "lower" | "higher" }[];
  readonly items: readonly ExamReviewItem[];
}
export interface ExamSnapshot {
  readonly availability: ExamAvailability;
  readonly serverNow: string;
  readonly attemptId: string | null;
  readonly revision: number;
  readonly status: "idle" | "in_progress" | "completed" | "abandoned";
  readonly phase: ExamPhase | null;
  readonly deadline: string | null;
  readonly questions: readonly ExamQuestion[];
  readonly answers: Readonly<Record<string, ExamAnswer>>;
  readonly calculator: { readonly graphing?: unknown; readonly scientific?: unknown };
  readonly result: ExamResult | null;
}
export interface ExamCommand {
  readonly operation: "start" | "sync" | "save" | "abandon" | "calculator";
  readonly requestId: string;
  readonly attemptId?: string;
  readonly expectedRevision?: number;
  readonly questionId?: string;
  readonly answer?: ExamAnswer;
  readonly calculator?: { readonly graphing?: unknown; readonly scientific?: unknown };
}
