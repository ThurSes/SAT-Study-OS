import type { Answer, Question, SimulatorPlan } from "../../types/domain";

export type SessionStatus = "idle" | "running" | "paused" | "expired";

export interface SessionState {
  readonly status: SessionStatus;
  readonly answers: Readonly<Record<string, Answer>>;
  /** Remaining time at the current clock anchor, in milliseconds. */
  readonly remainingMs: number;
  readonly startedAtMs: number | null;
}

export type SessionEvent =
  | { readonly type: "start" | "pause" | "resume" | "restart" | "tick" }
  | { readonly type: "select"; readonly questionId: string; readonly optionId: string | null }
  | { readonly type: "toggle-review"; readonly questionId: string };

export function createSession(plan: SimulatorPlan): SessionState {
  const durationMs = plan.durationSeconds * 1_000;
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error("A duração da sessão deve ser positiva e finita.");
  }

  const ids = new Set<string>();
  for (const question of plan.questions) {
    if (ids.has(question.id)) {
      throw new Error(`A questão ${question.id} aparece mais de uma vez no plano.`);
    }
    ids.add(question.id);
  }

  return {
    status: "idle",
    answers: Object.fromEntries(plan.questions.map((question) => [question.id, {
      question: { ...question },
      optionId: null,
      markedForReview: false,
    }])),
    remainingMs: durationMs,
    startedAtMs: null,
  };
}

/** The caller injects a monotonic clock; intervals only request a fresh reading. */
export function getRemainingMs(state: SessionState, nowMs: number): number {
  if (state.status !== "running" || state.startedAtMs === null) {
    return state.remainingMs;
  }
  return Math.max(0, state.remainingMs - Math.max(0, nowMs - state.startedAtMs));
}

export function transitionSession(
  state: SessionState,
  event: SessionEvent,
  plan: SimulatorPlan,
  questions: readonly Question[],
  nowMs: number,
): SessionState {
  if (event.type === "restart") return createSession(plan);

  const remainingMs = getRemainingMs(state, nowMs);
  // Enforce the deadline before accepting any action, even without a preceding tick.
  if (state.status === "running" && remainingMs === 0) {
    return { ...state, status: "expired", remainingMs: 0, startedAtMs: null };
  }

  if (event.type === "start" && state.status === "idle") {
    return { ...state, status: "running", startedAtMs: nowMs };
  }
  if (event.type === "resume" && state.status === "paused") {
    return { ...state, status: "running", startedAtMs: nowMs };
  }
  if (state.status !== "running") return state;

  const runningState: SessionState = {
    ...state,
    remainingMs,
    startedAtMs: Math.max(state.startedAtMs ?? nowMs, nowMs),
  };
  if (event.type === "tick") return runningState;
  if (event.type === "pause") {
    return { ...runningState, status: "paused", startedAtMs: null };
  }
  if (event.type !== "select" && event.type !== "toggle-review") return state;

  const ref = plan.questions.find((question) => question.id === event.questionId);
  const question = ref && questions.find((item) => item.id === ref.id && item.version === ref.version);
  const answer = Object.hasOwn(state.answers, event.questionId) ? state.answers[event.questionId] : undefined;
  if (!ref || !question || !answer || answer.question.version !== ref.version) return state;
  if (event.type === "select" && event.optionId !== null && !question.options.some((option) => option.id === event.optionId)) {
    return state;
  }

  return {
    ...runningState,
    answers: {
      ...state.answers,
      [event.questionId]: event.type === "select"
        ? { ...answer, optionId: event.optionId }
        : { ...answer, markedForReview: !answer.markedForReview },
    },
  };
}
