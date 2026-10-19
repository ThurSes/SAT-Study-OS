import { describe, expect, it } from "vitest";
import type { Question, SimulatorPlan } from "../../types/domain";
import { createSession, getRemainingMs, transitionSession, type SessionEvent, type SessionState } from "./session";

const questions: readonly Question[] = ["one", "two"].map((id) => ({
  id,
  version: 1,
  skillId: "linear-equations",
  section: "math",
  difficulty: "easy",
  format: "multiple-choice",
  prompt: "Development question",
  language: "en",
  options: [
    { id: `${id}-a`, label: "A", text: "First option" },
    { id: `${id}-b`, label: "B", text: "Second option" },
  ],
  provenance: { kind: "original-development", author: "SAT Study OS" },
}));
const plan: SimulatorPlan = {
  id: "short-development",
  title: "Sessão curta experimental",
  section: "math",
  durationSeconds: 5,
  questions: questions.map(({ id, version }) => ({ id, version })),
  adaptive: false,
};
const act = (state: SessionState, event: SessionEvent, nowMs: number) =>
  transitionSession(state, event, plan, questions, nowMs);
const start = () => act(createSession(plan), { type: "start" }, 1_000);

describe("local experimental session", () => {
  it("starts with versioned blank answers and a full clock", () => {
    const idle = createSession(plan);
    expect(idle.status).toBe("idle");
    expect(idle.startedAtMs).toBeNull();
    expect(idle.answers.one).toEqual({ question: { id: "one", version: 1 }, optionId: null, markedForReview: false });
    expect(getRemainingMs(idle, 50_000)).toBe(5_000);
    const running = act(idle, { type: "start" }, 1_000);
    expect(running.status).toBe("running");
    expect(getRemainingMs(running, 2_500)).toBe(3_500);
    expect(idle.status).toBe("idle");
  });

  it("accumulates elapsed active time across pauses and resumes", () => {
    const paused = act(start(), { type: "pause" }, 2_500);
    expect(paused.status).toBe("paused");
    expect(getRemainingMs(paused, 50_000)).toBe(3_500);
    const resumed = act(paused, { type: "resume" }, 50_000);
    expect(getRemainingMs(resumed, 51_000)).toBe(2_500);
    const pausedAgain = act(resumed, { type: "pause" }, 51_500);
    expect(pausedAgain.remainingMs).toBe(2_000);
    expect(act(act(pausedAgain, { type: "resume" }, 60_000), { type: "tick" }, 62_000).status).toBe("expired");
  });

  it("expires at the exact deadline and after a suspended tab returns", () => {
    const running = start();
    expect(act(running, { type: "tick" }, 5_999).status).toBe("running");
    expect(act(running, { type: "tick" }, 6_000)).toMatchObject({ status: "expired", remainingMs: 0, startedAtMs: null });
    expect(act(running, { type: "tick" }, 900_000)).toMatchObject({ status: "expired", remainingMs: 0 });
  });

  it.each<SessionEvent>([
    { type: "select", questionId: "one", optionId: "one-a" },
    { type: "toggle-review", questionId: "one" },
    { type: "pause" },
  ])("checks the deadline before $type without needing a tick", (event) => {
    const running = start();
    const expired = act(running, event, 6_000);
    expect(expired.status).toBe("expired");
    expect(expired.answers).toBe(running.answers);
  });

  it("preserves answers and review marks while other questions change", () => {
    let state = act(start(), { type: "select", questionId: "one", optionId: "one-a" }, 1_100);
    state = act(state, { type: "toggle-review", questionId: "one" }, 1_200);
    state = act(state, { type: "select", questionId: "two", optionId: "two-b" }, 1_300);
    expect(state.answers.one).toMatchObject({ optionId: "one-a", markedForReview: true });
    state = act(state, { type: "select", questionId: "one", optionId: null }, 1_400);
    expect(state.answers.one).toMatchObject({ optionId: null, markedForReview: true });
    expect(state.answers.two.optionId).toBe("two-b");
    state = act(state, { type: "toggle-review", questionId: "one" }, 1_500);
    expect(state.answers.one.markedForReview).toBe(false);
  });

  it("rejects unknown questions, cross-question options and mismatched versions", () => {
    const running = start();
    expect(act(running, { type: "select", questionId: "missing", optionId: "one-a" }, 1_100)).toBe(running);
    expect(act(running, { type: "toggle-review", questionId: "missing" }, 1_100)).toBe(running);
    expect(act(running, { type: "select", questionId: "one", optionId: "two-a" }, 1_100)).toBe(running);
    const wrongVersion = questions.map((question) => ({ ...question, version: 2 }));
    expect(transitionSession(running, { type: "select", questionId: "one", optionId: "one-a" }, plan, wrongVersion, 1_100)).toBe(running);
    expect(transitionSession(running, { type: "toggle-review", questionId: "one" }, plan, [], 1_100)).toBe(running);
    const differentPlan = { ...plan, questions: [{ id: "unknown", version: 1 }] };
    expect(transitionSession(running, { type: "select", questionId: "one", optionId: "one-a" }, differentPlan, questions, 1_100)).toBe(running);
  });

  it("keeps idle, paused and expired sessions read-only", () => {
    const idle = createSession(plan);
    const paused = act(start(), { type: "pause" }, 1_500);
    const expired = act(start(), { type: "tick" }, 6_000);
    for (const state of [idle, paused, expired]) {
      expect(act(state, { type: "select", questionId: "one", optionId: "one-a" }, 6_100)).toBe(state);
      expect(act(state, { type: "toggle-review", questionId: "one" }, 6_100)).toBe(state);
    }
    expect(act(paused, { type: "start" }, 7_000)).toBe(paused);
    expect(act(idle, { type: "resume" }, 7_000)).toBe(idle);
    expect(act(expired, { type: "resume" }, 7_000)).toBe(expired);
    const running = start();
    expect(act(running, { type: "start" }, 2_000)).toBe(running);
    expect(act(running, { type: "resume" }, 2_000)).toBe(running);
  });

  it("restarts with clean answers, review flags and the full duration", () => {
    let state = act(start(), { type: "select", questionId: "one", optionId: "one-b" }, 1_100);
    state = act(state, { type: "toggle-review", questionId: "one" }, 1_200);
    expect(act(state, { type: "restart" }, 4_000)).toEqual(createSession(plan));
    expect(act(act(state, { type: "tick" }, 6_000), { type: "restart" }, 8_000)).toEqual(createSession(plan));
  });

  it("does not increase remaining time when a clock reading moves backward", () => {
    const running = act(start(), { type: "tick" }, 2_000);
    expect(getRemainingMs(running, 1_500)).toBe(4_000);
    const earlier = act(running, { type: "tick" }, 1_500);
    expect(earlier.remainingMs).toBe(4_000);
    expect(getRemainingMs(earlier, 2_500)).toBe(3_500);
    expect(getRemainingMs(earlier, 9_000)).toBe(0);
  });

  it.each([0, -1, NaN, Infinity, -Infinity, Number.MAX_VALUE])("rejects invalid duration %s", (durationSeconds) => {
    expect(() => createSession({ ...plan, durationSeconds })).toThrow("positiva e finita");
  });

  it("rejects repeated logical questions even when their versions differ", () => {
    expect(() => createSession({ ...plan, questions: [{ id: "one", version: 1 }, { id: "one", version: 2 }] })).toThrow("mais de uma vez");
  });
});
