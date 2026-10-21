"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Bookmark, Calculator, ChevronLeft, ChevronRight, Highlighter, List, StickyNote, Underline, X } from "lucide-react";
import { EMPTY_EXAM_ANSWER, numericRational } from "@/lib/sat/exam";
import type { ExamAnswer, ExamCommand, ExamQuestion, ExamSnapshot, SaveResult } from "@/types/domain";
import { ExamCalculator } from "./exam-calculator";
import { ExamBlocks, ExamReference, ExamResults } from "./exam-content";
import styles from "./exam.module.css";

type Props = { calculatorApiKey?: string; initialSnapshot: ExamSnapshot; onCommand: (command: ExamCommand) => Promise<SaveResult<ExamSnapshot>> };
type Pending = { operation: ExamCommand["operation"]; questionId?: string; answer?: ExamAnswer; calculator?: ExamSnapshot["calculator"]; phase: ExamSnapshot["phase"]; command?: ExamCommand };
type Connection = "saved" | "saving" | "offline" | "error";

/** One queue owns revisions, retries and optimistic edits. A dispatched payload is immutable. */
function useExamConnection({ initialSnapshot, onCommand }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [connection, setConnection] = useState<Connection>("saved");
  const [error, setError] = useState("");
  const committed = useRef(initialSnapshot);
  const queue = useRef<Pending[]>([]);
  const busy = useRef(false);
  const blocked = useRef(false);
  const mounted = useRef(true);
  const clock = useRef({ server: Date.parse(initialSnapshot.serverNow), monotonic: 0 });

  const publish = useCallback((value: ExamSnapshot) => {
    committed.current = value;
    const monotonic = performance.now();
    // A retried receipt or delayed response may carry an older timestamp. It
    // must never rewind the countdown while waiting for a fresh server sync.
    const estimatedNow = clock.current.server + Math.max(0, monotonic - clock.current.monotonic);
    clock.current = { server: Math.max(Date.parse(value.serverNow), estimatedNow), monotonic };
    const answers = { ...value.answers };
    let calculator = value.calculator;
    for (const pending of queue.current) {
      if (pending.phase !== value.phase || value.status !== "in_progress") continue;
      if (pending.questionId && pending.answer) answers[pending.questionId] = pending.answer;
      if (pending.calculator) calculator = pending.calculator;
    }
    if (mounted.current) setSnapshot({ ...value, answers, calculator });
  }, []);

  const drain = useCallback(async () => {
    if (busy.current || blocked.current || !mounted.current) return;
    busy.current = true;
    while (queue.current.length && mounted.current) {
      const next = queue.current[0];
      const current = committed.current;
      if (!next.command && ["save", "calculator"].includes(next.operation) && (next.phase !== current.phase || current.status !== "in_progress")) { queue.current.shift(); continue; }
      next.command ??= { operation: next.operation, requestId: crypto.randomUUID(), ...(current.attemptId ? { attemptId: current.attemptId } : {}), expectedRevision: current.revision, ...(next.questionId ? { questionId: next.questionId, answer: next.answer } : {}), ...(next.calculator ? { calculator: next.calculator } : {}) };
      setConnection("saving");
      try {
        const response = await onCommand(next.command);
        if (!mounted.current) break;
        if (!response.ok) {
          // Deterministic server rejection needs an explicit reload, not an overwrite.
          blocked.current = true;
          setError(response.error);
          setConnection("error");
          break;
        }
        queue.current.shift();
        publish(response.value);
        setError("");
      } catch {
        blocked.current = true;
        setError("Your changes have not been confirmed. Keep this page open and retry the same operation.");
        setConnection("offline");
        break;
      }
    }
    busy.current = false;
    if (!queue.current.length && !blocked.current && mounted.current) setConnection("saved");
  }, [onCommand, publish]);

  const enqueue = useCallback((item: Omit<Pending, "phase">) => {
    const pending: Pending = { ...item, phase: committed.current.phase };
    const existing = queue.current.findIndex((entry) => !entry.command && entry.operation === item.operation && entry.questionId === item.questionId);
    if (existing >= 0) queue.current[existing] = pending;
    else queue.current.push(pending);
    if (item.answer && item.questionId) setSnapshot((value) => ({ ...value, answers: { ...value.answers, [item.questionId!]: item.answer! } }));
    if (item.calculator) setSnapshot((value) => ({ ...value, calculator: item.calculator! }));
    void drain();
  }, [drain]);

  const retry = useCallback(() => { blocked.current = false; void drain(); }, [drain]);
  const reload = useCallback(() => {
    if (busy.current) return;
    queue.current = [];
    blocked.current = false;
    setError("");
    enqueue({ operation: "sync" });
  }, [enqueue]);

  useEffect(() => {
    mounted.current = true;
    clock.current = { server: Date.parse(initialSnapshot.serverNow), monotonic: performance.now() };
    return () => { mounted.current = false; };
  }, [initialSnapshot.serverNow]);

  useEffect(() => {
    const sync = () => enqueue({ operation: "sync" });
    const online = () => { if (blocked.current) return; sync(); };
    const visible = () => { if (document.visibilityState === "visible") sync(); };
    const beforeUnload = (event: BeforeUnloadEvent) => { if (queue.current.length) { event.preventDefault(); event.returnValue = ""; } };
    const interval = window.setInterval(sync, 15000);
    window.addEventListener("focus", sync);
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("beforeunload", beforeUnload);
    return () => { clearInterval(interval); window.removeEventListener("focus", sync); window.removeEventListener("online", online); document.removeEventListener("visibilitychange", visible); window.removeEventListener("beforeunload", beforeUnload); };
  }, [enqueue]);
  return { snapshot, connection, error, enqueue, retry, reload, clock };
}

function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const origin = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); origin?.focus(); };
  }, []);
  return <dialog ref={ref} className={styles.dialog} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }}><div className={styles.dialogHeader}><h2>{title}</h2><button type="button" onClick={onClose} aria-label={`Close ${title}`}><X size={20} /></button></div>{children}</dialog>;
}

function NumericAnswer({ question, answer, disabled, onChange, onValidityChange }: { question: ExamQuestion; answer: ExamAnswer; disabled: boolean; onChange: (value: string | null) => void; onValidityChange: (valid: boolean) => void }) {
  const [draft, setDraft] = useState(answer.value ?? "");
  const [previousValue, setPreviousValue] = useState(answer.value);
  if (previousValue !== answer.value) { setPreviousValue(answer.value); setDraft(answer.value ?? ""); }
  const valid = !draft || !!numericRational(draft);
  return <div className={styles.numeric}><label htmlFor={`numeric-${question.id}`}>Your answer</label><p id="numeric-help">Enter a fraction or decimal. Use up to 5 characters, or 6 including a negative sign. Do not enter a percent sign, commas, or units.</p><input id={`numeric-${question.id}`} type="text" inputMode="text" autoComplete="off" spellCheck={false} value={draft} maxLength={draft.startsWith("-") ? 6 : 5} aria-describedby="numeric-help numeric-preview" aria-invalid={!valid} disabled={disabled} onChange={(event) => { const value = event.target.value; const accepted = !value || !!numericRational(value); setDraft(value); onValidityChange(accepted); if (accepted) onChange(value || null); }} /><p id="numeric-preview" className={!valid ? styles.error : styles.muted}>{valid ? `Answer preview: ${draft || "blank"}` : "This format is invalid and has not been saved. Correct or clear it before leaving this question. Enter a number, decimal, or fraction with a nonzero denominator."}</p>{!valid && <p>Previously saved answer: {answer.value ?? "blank"}</p>}<button type="button" className={styles.clearAnswer} disabled={disabled || !draft} onClick={() => { setDraft(""); onValidityChange(true); onChange(null); }}>Clear answer</button></div>;
}

export function ExamWorkspace(props: Props) {
  const { snapshot, connection, error, enqueue, retry, reload, clock } = useExamConnection(props);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(() => props.initialSnapshot.deadline ? Math.max(0, Date.parse(props.initialSnapshot.deadline) - Date.parse(props.initialSnapshot.serverNow)) : 0);
  const [hideTimer, setHideTimer] = useState(false);
  const [panel, setPanel] = useState<"questions" | "notes" | "reference" | "abandon" | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [lineReader, setLineReader] = useState(false);
  const [linePosition, setLinePosition] = useState(120);
  const [annotationMessage, setAnnotationMessage] = useState("");
  const [invalidNumericQuestion, setInvalidNumericQuestion] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const question = snapshot.questions[Math.min(index, Math.max(0, snapshot.questions.length - 1))];
  const answer = question ? snapshot.answers[question.id] ?? EMPTY_EXAM_ANSWER : EMPTY_EXAM_ANSWER;
  const view = useRef(snapshot);
  const observed = useRef<Record<string, number>>({});
  const questionRef = useRef(question?.id);
  const contentRef = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const expiredPhase = useRef<string | null>(null);
  const [previousPhase, setPreviousPhase] = useState(snapshot.phase);
  const editable = snapshot.status === "in_progress" && snapshot.phase !== "break" && remaining > 0 && connection !== "error";
  const isMath = snapshot.phase === "math1" || snapshot.phase === "math2";

  useEffect(() => { view.current = snapshot; questionRef.current = question?.id; }, [snapshot, question?.id]);
  useEffect(() => {
    const tick = () => {
      const base = clock.current;
      const now = base.server + Math.max(performance.now() - base.monotonic, 0);
      const left = snapshot.deadline ? Math.max(0, Date.parse(snapshot.deadline) - now) : 0;
      setRemaining(left);
      if (!left && snapshot.status === "in_progress" && expiredPhase.current !== snapshot.deadline) {
        expiredPhase.current = snapshot.deadline;
        enqueue({ operation: "sync" });
      }
    };
    const timer = window.setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [snapshot.deadline, snapshot.status, clock, enqueue]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const id = questionRef.current;
      if (id && document.visibilityState === "visible" && view.current.status === "in_progress") observed.current[id] = Math.min(2_100_000, (observed.current[id] ?? view.current.answers[id]?.observedMs ?? 0) + 1000);
    }, 1000);
    const updateOnline = () => setOnline(navigator.onLine);
    updateOnline(); window.addEventListener("online", updateOnline); window.addEventListener("offline", updateOnline);
    return () => { clearInterval(timer); window.removeEventListener("online", updateOnline); window.removeEventListener("offline", updateOnline); };
  }, []);
  if (previousPhase !== snapshot.phase) {
    setPreviousPhase(snapshot.phase);
    // Module changes are the only time navigation and transient panels reset.
    setIndex(0); setPanel(null); setHideTimer(false); setAnnotationMessage(""); setInvalidNumericQuestion(null);
  }
  useEffect(() => { heading.current?.focus(); }, [snapshot.phase]);

  const updateAnswer = useCallback((patch: Partial<ExamAnswer>, id = questionRef.current) => {
    if (!id || !editable) return;
    const current = view.current.answers[id] ?? EMPTY_EXAM_ANSWER;
    const next = { ...current, ...patch, observedMs: observed.current[id] ?? current.observedMs };
    view.current = { ...view.current, answers: { ...view.current.answers, [id]: next } };
    enqueue({ operation: "save", questionId: id, answer: next });
  }, [editable, enqueue]);
  useEffect(() => {
    const interval = window.setInterval(() => { if (editable) updateAnswer({}); }, 15000);
    const hidden = () => { if (document.visibilityState === "hidden" && editable) updateAnswer({}); };
    document.addEventListener("visibilitychange", hidden);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", hidden); };
  }, [editable, updateAnswer]);

  const navigate = (next: number) => { if (invalidNumericQuestion === question?.id) { setPanel(null); setAnnotationMessage("Correct or clear the invalid numeric answer before leaving this question."); return; } updateAnswer({}); setIndex(next); setPanel(null); setAnnotationMessage(""); requestAnimationFrame(() => heading.current?.focus()); };
  const annotate = (style: "highlight" | "underline") => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || selection.isCollapsed || !contentRef.current) { setAnnotationMessage("Select text in a passage or question first."); return; }
    const range = selection.getRangeAt(0);
    const element = range.startContainer.parentElement?.closest<HTMLElement>("[data-exam-block]");
    if (!element || !contentRef.current.contains(element) || !element.contains(range.endContainer)) { setAnnotationMessage("Select text within a single paragraph."); return; }
    const before = range.cloneRange(); before.selectNodeContents(element); before.setEnd(range.startContainer, range.startOffset);
    if (answer.annotations.length >= 100) { setAnnotationMessage("Annotation limit reached. Clear annotations to add more."); return; }
    updateAnswer({ annotations: [...answer.annotations, { blockId: element.dataset.examBlock!, start: before.toString().length, end: before.toString().length + range.toString().length, style }] });
    selection.removeAllRanges(); setAnnotationMessage("Text annotated.");
  };
  const seconds = Math.ceil(remaining / 1000);
  const time = `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  const active = snapshot.status === "in_progress";
  const saveLabel = invalidNumericQuestion ? "Invalid answer draft — not saved" : connection === "saving" ? "Saving…" : connection === "saved" ? "Saved" : "Not synchronized";
  const connectionBanner = <>{error && <div className={styles.errorBanner} role="alert"><p>{error}</p>{connection === "offline" && <button type="button" onClick={retry}>Retry saving</button>}<button type="button" onClick={() => setPanel("abandon")}>Review recovery options</button></div>}{!online && <p className={styles.notice} role="status">You are offline. Keep this page open. The timer continues; answers received after the deadline cannot be saved.</p>}</>;

  if (snapshot.status === "completed" && snapshot.result) return <main id="main-content" className={styles.workspace}><ExamResults result={snapshot.result} /></main>;
  if (snapshot.status === "abandoned") return <main id="main-content" className={styles.lobby} lang="pt-BR"><p className={styles.eyebrow}>TENTATIVA ENCERRADA</p><h1>Simulado abandonado.</h1><p>Esta tentativa foi preservada como abandonada e não gera resultado de prova concluída.</p><a className={styles.button} href="/simulador">Voltar ao simulador</a><Link className={styles.button} href="/">Visão geral</Link></main>;

  return <main id="main-content" className={styles.workspace} lang={active ? "en" : "pt-BR"}>
    {!active ? <section className={styles.lobby}><p className={styles.eyebrow}>SAT STUDY OS · SIMULADO ADAPTATIVO</p><h1>Um ensaio completo.<br />O seu próximo passo.</h1><p className={styles.lead}>98 questões. Quatro módulos. Um intervalo. Reserve 2 horas e 24 minutos para praticar com foco.</p><div className={styles.schedule}><div><strong>Reading and Writing</strong><span>2 × 27 questões · 32 min por módulo</span></div><div><strong>Intervalo</strong><span>10 minutos</span></div><div><strong>Math</strong><span>2 × 22 questões · 35 min por módulo</span></div></div><p>A prova começa em inglês. Você pode revisar questões apenas dentro do módulo atual. Não há pausa nem avanço antecipado; fechar a página não interrompe o tempo.</p><p>O segundo módulo de cada seção se ajusta ao primeiro. O resultado mostra acertos e habilidades, sem conversão para nota oficial do SAT.</p><div className={styles.readiness}><p><strong>Banco de questões:</strong> {snapshot.availability.reviewedCount} revisadas · {snapshot.availability.ready ? "pronto para iniciar" : "ainda indisponível"}</p>{snapshot.availability.reason && <p>{snapshot.availability.reason}</p>}<p><strong>Conexão:</strong> {online ? "disponível no dispositivo; será confirmada ao iniciar" : "sem conexão"}</p></div><button type="button" className={styles.button} onClick={() => setCalculatorOpen((value) => !value)}>Testar calculadora</button>{calculatorOpen && <div lang="en"><ExamCalculator apiKey={props.calculatorApiKey} state={{}} onChange={() => undefined} /></div>}<div className={styles.lobbyActions}><button type="button" className={styles.primary} disabled={!snapshot.availability.ready || !online || connection === "saving"} onClick={() => enqueue({ operation: "start" })}>{connection === "saving" ? "Iniciando…" : "Iniciar simulado completo"}</button><a className={styles.button} href="/simulador/treino">Fazer treino curto</a></div><p className={styles.muted}>Questões importadas são privadas da sua conta. A adaptação é experimental e não reproduz a pontuação oficial.</p>{connectionBanner}</section> : <>
      <a className="skip-link" href="#exam-question">Skip to question</a>
      <header className={styles.header}><div><p className={styles.eyebrow}>SAT STUDY OS</p><h1>{snapshot.phase === "break" ? "Scheduled break" : `${isMath ? "Math" : "Reading and Writing"}: Module ${snapshot.phase?.endsWith("1") ? "1" : "2"}`}</h1></div><div className={styles.timer}><span role="timer" aria-live="off" aria-label={`Time remaining ${time}`} className={seconds <= 300 ? styles.timerWarning : ""}>{hideTimer && seconds > 300 ? "Time hidden" : time}</span><button type="button" onClick={() => setHideTimer((value) => !value)} disabled={seconds <= 300}>{hideTimer && seconds > 300 ? "Show time" : "Hide time"}</button><span className="sr-only" role="status">{seconds <= 300 && seconds > 0 ? "Five minutes or less remaining." : seconds === 0 ? "Time has ended. Waiting for the next module." : ""}</span></div><div className={styles.connection}><span role="status">{saveLabel}</span><button type="button" onClick={() => setPanel("abandon")}>Exit test</button></div></header>
      {connectionBanner}
      {snapshot.phase === "break" ? <section className={styles.break}><p className={styles.eyebrow}>TAKE A BREATH</p><h2>Your 10-minute break.</h2><p>Math begins automatically when the break ends. You cannot return to Reading and Writing.</p><p>Leave this page open. Be ready with your calculator when the timer reaches zero.</p></section> : question ? <>
        <nav className={styles.tools} aria-label="Test tools"><button type="button" onClick={() => setPanel("notes")}><StickyNote size={17} />Notes</button><button type="button" disabled={!editable} onMouseDown={(event) => event.preventDefault()} onClick={() => annotate("highlight")}><Highlighter size={17} />Highlight</button><button type="button" disabled={!editable} onMouseDown={(event) => event.preventDefault()} onClick={() => annotate("underline")}><Underline size={17} />Underline</button><button type="button" aria-pressed={lineReader} onClick={() => setLineReader((value) => !value)}>Line reader</button>{answer.annotations.length > 0 && <button type="button" disabled={!editable} onClick={() => updateAnswer({ annotations: [] })}>Clear annotations</button>}{isMath && <><button type="button" aria-expanded={calculatorOpen} onClick={() => setCalculatorOpen((value) => !value)}><Calculator size={17} />Calculator</button><button type="button" onClick={() => setPanel("reference")}>Reference</button></>}</nav>
        <p className={styles.annotationStatus} role="status">{annotationMessage}</p>
        {lineReader && <div className={styles.readerControl}><label htmlFor="reader-position">Reading guide position</label><input id="reader-position" type="range" min="0" max="900" step="24" value={linePosition} onChange={(event) => setLinePosition(Number(event.target.value))} /><p>Use arrow keys to move the guide.</p></div>}
        <div className={`${styles.testBody} ${isMath && calculatorOpen ? styles.withCalculator : ""}`}><div ref={contentRef} className={`${styles.questionGrid} ${!question.passage.length ? styles.noPassage : ""}`}>
          {question.passage.length > 0 && <section className={styles.passage} aria-label="Passage"><ExamBlocks blocks={question.passage} annotations={answer.annotations} /></section>}
          <section className={styles.question} aria-labelledby="exam-question"><div className={styles.questionHeading}><h2 id="exam-question" tabIndex={-1} ref={heading}>Question {Math.min(index + 1, snapshot.questions.length)}</h2><button type="button" aria-pressed={answer.marked} disabled={!editable} onClick={() => updateAnswer({ marked: !answer.marked })}><Bookmark size={17} fill={answer.marked ? "currentColor" : "none"} />{answer.marked ? "Marked for review" : "Mark for review"}</button></div><ExamBlocks blocks={question.content} annotations={answer.annotations} />
            {question.format === "numeric" ? <NumericAnswer key={`${question.id}-${snapshot.phase}-${connection === "error"}`} question={question} answer={answer} disabled={!editable} onChange={(value) => updateAnswer({ value })} onValidityChange={(valid) => setInvalidNumericQuestion(valid ? null : question.id)} /> : <fieldset className={styles.options} disabled={!editable}><legend className="sr-only">Choose one answer</legend>{question.options.map((option) => <div key={option.id} className={`${styles.optionRow} ${answer.eliminated.includes(option.id) ? styles.eliminated : ""}`}><label className={`${styles.option} ${answer.value === option.id ? styles.selected : ""}`}><input type="radio" name={`answer-${question.id}`} value={option.id} checked={answer.value === option.id} onChange={() => updateAnswer({ value: option.id, eliminated: answer.eliminated.filter((id) => id !== option.id) })} /><span className={styles.optionLetter}>{option.label}</span><ExamBlocks blocks={option.content} /></label><button className={styles.eliminate} type="button" aria-label={`${answer.eliminated.includes(option.id) ? "Restore" : "Eliminate"} answer ${option.label}`} aria-pressed={answer.eliminated.includes(option.id)} onClick={() => updateAnswer({ eliminated: answer.eliminated.includes(option.id) ? answer.eliminated.filter((id) => id !== option.id) : [...answer.eliminated, option.id] })}>{answer.eliminated.includes(option.id) ? "Undo" : <span aria-hidden="true">{option.label}<span className={styles.strike} /></span>}</button></div>)}</fieldset>}
            {question.format !== "numeric" && <button type="button" disabled={!editable || answer.value === null} className={styles.clearAnswer} onClick={() => updateAnswer({ value: null })}>Clear answer</button>}{question.previouslySeen && <p className={styles.muted}>You have seen this question in a previous attempt.</p>}{!editable && <p className={styles.notice}>Responses are locked. {remaining === 0 ? "Connecting to the next module…" : "Resolve the synchronization issue to continue."}</p>}
          </section>{lineReader && <div aria-hidden="true" className={styles.readingLine} style={{ top: `${linePosition}px` }} />}
        </div>{isMath && calculatorOpen && <aside className={styles.calculatorPanel}><ExamCalculator apiKey={props.calculatorApiKey} state={snapshot.calculator} disabled={!editable} onChange={(calculator) => { if (editable) enqueue({ operation: "calculator", calculator }); }} /></aside>}</div>
        <footer className={styles.footer}><button type="button" disabled={index === 0} onClick={() => navigate(Math.max(0, index - 1))}><ChevronLeft size={18} />Back</button><button type="button" onClick={() => setPanel("questions")}><List size={18} />Question {Math.min(index + 1, snapshot.questions.length)} of {snapshot.questions.length}</button><button type="button" className={styles.primary} onClick={() => index < snapshot.questions.length - 1 ? navigate(index + 1) : setPanel("questions")}>{index < snapshot.questions.length - 1 ? "Next" : "Review"}<ChevronRight size={18} /></button></footer>
      </> : <p role="status" className={styles.notice}>Loading the current module…</p>}
    </>}
    {panel === "questions" && <Dialog title="Review this module" onClose={() => setPanel(null)}><p>You can review any question in this module until time expires. Other modules are not available.</p><p className={styles.muted}>✓ Answered · ⚑ Marked · No symbol: unanswered</p><div className={styles.questionMap}>{snapshot.questions.map((item, i) => { const value = snapshot.answers[item.id]; return <button key={item.id} type="button" aria-label={`Question ${i + 1}, ${value?.value ? "answered" : "unanswered"}${value?.marked ? ", marked for review" : ""}`} aria-current={i === index ? "step" : undefined} onClick={() => navigate(i)}><strong>{i + 1}</strong><span aria-hidden="true">{value?.value ? "✓" : ""}{value?.marked ? "⚑" : ""}</span></button>; })}</div><p>The next module starts automatically. You cannot finish this module early.</p></Dialog>}
    {panel === "notes" && <Dialog title="Question notes" onClose={() => setPanel(null)}><label htmlFor="question-notes">Notes for question {index + 1}</label><textarea id="question-notes" rows={8} maxLength={4000} value={answer.notes} disabled={!editable} onChange={(event) => updateAnswer({ notes: event.target.value })} /><p className={styles.muted}>{answer.notes.length} / 4000 characters · {saveLabel}</p></Dialog>}
    {panel === "reference" && <Dialog title="Math reference" onClose={() => setPanel(null)}><ExamReference /></Dialog>}
    {panel === "abandon" && <Dialog title={error ? "Synchronization recovery" : "Exit this test?"} onClose={() => setPanel(null)}>{error ? <><p>{error}</p><p>Reloading discards changes that have not been confirmed and loads the server’s saved attempt. This resolves conflicts with another tab. The timer continues.</p><button type="button" className={styles.primary} onClick={() => { reload(); setPanel(null); }}>Discard pending changes and reload</button></> : <><p>Your timer will keep running if you close this page. Abandoning ends this attempt permanently, without a completed result.</p><button type="button" className={styles.danger} onClick={() => { updateAnswer({}); enqueue({ operation: "abandon" }); setPanel(null); }}>Abandon attempt</button></>}<button type="button" onClick={() => setPanel(null)}>Keep working</button></Dialog>}
  </main>;
}
