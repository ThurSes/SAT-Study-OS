"use client";

// Development-only UI harness. All content is original fixture data, never a real attempt.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ExamCommand, ExamPhase, ExamQuestion, ExamResult, ExamSnapshot, SaveResult } from "@/types/domain";
import { EMPTY_EXAM_ANSWER } from "@/lib/sat/exam";
import { ExamWorkspace } from "./exam-workspace";

const attemptId = "a0000000-0000-4000-8000-000000000001";
const phases: ExamPhase[] = ["rw1", "rw2", "break", "math1", "math2"];
const choices = ["A", "B", "C", "D"].map((label, i) => ({ id: label, label, content: [{ id: `option-${label}`, type: "text" as const, text: ["A carefully controlled observation.", "A conclusion that ignores the evidence.", "A change unrelated to the experiment.", "An unsupported generalization."][i] }] }));
function questions(phase: ExamPhase): ExamQuestion[] {
  if (phase === "break") return [];
  const math = phase.startsWith("math");
  return Array.from({ length: 3 }, (_, i) => ({
    id: `b0000000-0000-4000-8000-00000000000${i + 1}`, version: 1, section: math ? "math" : "rw", domain: math ? "algebra" : "information-and-ideas", skillId: math ? "linear-equations" : "central-ideas", difficulty: "medium", format: math && i === 0 ? "numeric" : "multiple-choice", passage: math ? [] : [{ id: "passage", type: "text", text: "A research team studied how a small garden changed over time. By recording the same measurements each morning, the team could compare observations made under similar conditions. The consistent approach helped distinguish an actual trend from a temporary variation." }], content: math ? [{ id: "stem", type: "text", text: "What value of x satisfies the equation?" }, { id: "equation", type: "math", latex: "2x+3=4" }] : [{ id: "stem", type: "text", text: `Which choice best describes the research approach in the passage? (Development question ${i + 1})` }], options: math && i === 0 ? [] : choices, provenance: { kind: "original", label: "Original development fixture — not College Board material" }, previouslySeen: i === 2,
  }));
}
function initial(phase: string): ExamSnapshot {
  const selected = phases.find((item) => item === phase) ?? null;
  const now = Date.now();
  return { availability: { ready: true, reviewedCount: 200, reason: "Dados fictícios de desenvolvimento — não há persistência real." }, serverNow: new Date(now).toISOString(), attemptId: selected ? attemptId : null, revision: 0, status: selected ? "in_progress" : "idle", phase: selected, deadline: selected ? new Date(now + 60000).toISOString() : null, questions: selected ? questions(selected) : [], answers: {}, calculator: {}, result: null };
}

export function ExamPreview({ phase, failure, calculatorMock = false }: { phase: string; failure: string; calculatorMock?: boolean }) {
  const [first] = useState(() => initial(phase));
  const stored = useRef(first);
  const receipts = useRef(new Map<string, ExamSnapshot>());
  const failed = useRef(false);
  const clock = useRef<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(first);
  useEffect(() => { clock.current ??= performance.now(); }, []);
  const onCommand = useCallback(async (command: ExamCommand): Promise<SaveResult<ExamSnapshot>> => {
    // Fixture "server" time is independent of the browser's mutable system clock.
    clock.current ??= performance.now();
    const now = Date.parse(first.serverNow) + performance.now() - clock.current;
    setLogs((items) => [...items.slice(-19), `${command.operation}:${command.requestId}:${command.expectedRevision}`]);
    if (receipts.current.has(command.requestId)) return { ok: true, value: receipts.current.get(command.requestId)! };
    if (failure === "conflict" && command.operation === "save" && !failed.current) { failed.current = true; stored.current = { ...stored.current, revision: stored.current.revision + 1 }; return { ok: false, error: "Another tab updated this attempt. Reload the saved version." }; }
    if (failure === "delayed" && command.operation === "save") await new Promise((resolve) => setTimeout(resolve, 200));
    let next = { ...stored.current, serverNow: new Date(now).toISOString() };
    if (command.operation === "start") next = { ...initial("rw1"), revision: 1 };
    if (["save", "calculator", "abandon"].includes(command.operation) && command.expectedRevision !== next.revision) return { ok: false, error: "Another tab updated this attempt. Reload the saved version." };
    if (command.operation === "save" && command.questionId && command.answer) next = { ...next, revision: next.revision + 1, answers: { ...next.answers, [command.questionId]: command.answer } };
    if (command.operation === "calculator" && command.calculator) next = { ...next, revision: next.revision + 1, calculator: command.calculator };
    if (command.operation === "abandon") next = { ...next, revision: next.revision + 1, status: "abandoned", deadline: null };
    while (command.operation === "sync" && next.deadline && now >= Date.parse(next.deadline)) {
      const position = next.phase ? phases.indexOf(next.phase) : 0;
      if (position < phases.length - 1) { const nextPhase = phases[position + 1]; next = { ...next, phase: nextPhase, deadline: new Date(Date.parse(next.deadline) + 60000).toISOString(), questions: questions(nextPhase), answers: {}, revision: next.revision + 1 }; }
      else {
        const result: ExamResult = { correct: 1, total: 2, blank: 1, observedMs: 30000, sections: [{ section: "math", correct: 1, total: 2, route: "higher" }], items: next.questions.map((question, i) => ({ question, answer: next.answers[question.id] ?? EMPTY_EXAM_ANSWER, correct: i === 0, scored: i < 2, correctAnswer: i === 0 ? "1/2" : "A", explanation: "Development explanation. Subtract 3 from both sides, then divide by 2.", phase: "math2" })) };
        next = { ...next, status: "completed", result, questions: [], deadline: null, revision: next.revision + 1 };
      }
    }
    stored.current = next; receipts.current.set(command.requestId, next);
    setConfirmed(next);
    if (failure === "transport" && command.operation === "save" && !failed.current) { failed.current = true; throw new Error("Simulated connection lost after commit"); }
    return { ok: true, value: next };
  }, [failure, first.serverNow]);
  return <><div style={{ padding: "8px 16px", background: "var(--color-warning-surface)", color: "var(--color-warning)" }}>PREVIEW DE DESENVOLVIMENTO · Questões fictícias · módulos de 1 minuto · respostas apenas em memória</div><ExamWorkspace calculatorApiKey={calculatorMock ? "development-test-key" : undefined} initialSnapshot={first} onCommand={onCommand} /><details style={{ padding: 16, overflowWrap: "anywhere" }}><summary>Development command log</summary><pre style={{ whiteSpace: "pre-wrap" }} data-testid="command-log">{logs.join("\n")}</pre><pre style={{ whiteSpace: "pre-wrap" }} data-testid="confirmed-answers">{JSON.stringify(confirmed.answers)}</pre></details></>;
}
