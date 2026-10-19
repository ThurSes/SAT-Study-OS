"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, Check, Clock3, List, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { createSession, getRemainingMs, transitionSession, type SessionEvent, type SessionState } from "@/lib/sat/session";
import type { Answer, Question, SaveResult, SimulatorPlan, Skill, StoredSimulatorSession } from "@/types/domain";
import styles from "./simulator.module.css";

function SessionClock({ session, onExpire }: { session: SessionState; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(session.remainingMs);
  useEffect(() => {
    if (session.status !== "running") return;
    const interval = window.setInterval(() => {
      const milliseconds = getRemainingMs(session, performance.now());
      setRemaining(milliseconds);
      if (milliseconds === 0) onExpire();
    }, 200);
    return () => window.clearInterval(interval);
  }, [session, onExpire]);
  const seconds = Math.ceil((session.status === "running" ? Math.min(remaining, session.remainingMs) : session.remainingMs) / 1000);
  const value = `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  return <div className={`${styles.clock} ${seconds <= 60 ? styles.clockWarning : ""}`}>
    <Clock3 size={18} aria-hidden="true" />
    <div><span className={styles.clockLabel}>Tempo restante</span><span role="timer" aria-live="off" aria-label={`Tempo restante: ${value}`} className={styles.clockValue}>{value}</span></div>
    <span className="sr-only" role="status">{seconds > 0 && seconds <= 60 && session.status === "running" ? "Resta menos de um minuto." : ""}</span>
  </div>;
}

function QuestionContent({ question, answer, editable, onSelect, onToggleReview }: {
  question: Question; answer: Answer; editable: boolean;
  onSelect: (optionId: string) => void; onToggleReview: () => void;
}) {
  return <div className={styles.questionGrid}>
    <section className={styles.passage} aria-labelledby="passage-title">
      <p className={styles.sectionEyebrow}>LEIA COM ATENÇÃO</p>
      <h2 id="passage-title">O texto é seu ponto de partida.</h2>
      <div className={styles.passageText} lang={question.language}>{question.passage || question.prompt}</div>
      <p className={styles.source}>Texto original · SAT Study OS<br />Conteúdo de desenvolvimento</p>
    </section>
    <section className={styles.response} aria-labelledby="question-prompt">
      <div className={styles.responseHeading}>
        <span className={styles.sectionEyebrow}>SUA RESPOSTA</span>
        <Button variant="ghost" onClick={onToggleReview} aria-pressed={answer.markedForReview} disabled={!editable} className={styles.reviewButton}>
          <Bookmark size={17} fill={answer.markedForReview ? "currentColor" : "none"} aria-hidden="true" />{answer.markedForReview ? "Marcada para revisão" : "Marcar para revisão"}
        </Button>
      </div>
      <h2 id="question-prompt" lang={question.language} className={styles.prompt}>{question.prompt}</h2>
      <fieldset className={styles.options} disabled={!editable}>
        <legend className="sr-only">Selecione uma alternativa</legend>
        {question.options.map((option) => <label key={option.id} className={`${styles.option} ${answer.optionId === option.id ? styles.optionSelected : ""}`}>
          <input type="radio" name={`answer-${question.id}`} value={option.id} checked={answer.optionId === option.id} onChange={() => onSelect(option.id)} />
          <span className={styles.optionLetter} aria-hidden="true">{option.label}</span>
          <span lang={question.language}><span className="sr-only">Alternativa {option.label}: </span>{option.text}</span>
          {answer.optionId === option.id && <Check size={18} className={styles.optionCheck} aria-hidden="true" />}
        </label>)}
      </fieldset>
      {!editable && <p className={styles.lockHint}>{sessionHint["locked"]}</p>}
    </section>
  </div>;
}

const sessionHint = {
  idle: "Inicie a sessão para responder. O tempo começa quando você decidir.",
  running: "Respostas apenas em memória · Recarregar a página apaga esta sessão.",
  paused: "Sessão pausada. Retome para responder; a pausa é demonstrativa.",
  expired: "Tempo encerrado. Você pode consultar as questões; as respostas estão bloqueadas.",
  locked: "As alternativas ficam disponíveis enquanto o cronômetro está em andamento.",
} as const;

function restoreStored(value: StoredSimulatorSession): SessionState {
  return { status: value.status, answers: value.answers, remainingMs: value.remainingMs, startedAtMs: value.status === "running" ? performance.now() : null };
}

export function SimulatorSession({ plan, questions, skills, initialStored, onSaveEvent }: {
  plan: SimulatorPlan; questions: readonly Question[]; skills: readonly Skill[];
  initialStored?: StoredSimulatorSession;
  onSaveEvent?: (requestId: string, revision: number, event: SessionEvent) => Promise<SaveResult<StoredSimulatorSession>>;
}) {
  const [session, setSession] = useState(() => initialStored ? restoreStored(initialStored) : createSession(plan));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveFeedback, setSaveFeedback] = useState("");
  const revision = useRef(initialStored?.revision ?? 0);
  const savingLock = useRef(false);
  const retry = useRef<{ requestId: string; revision: number; event: SessionEvent } | null>(null);
  const expirationRequested = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const timerControl = useRef<HTMLButtonElement>(null);
  const restarting = useRef(false);
  const orderedQuestions = plan.questions.map((ref) => questions.find((question) => question.id === ref.id && question.version === ref.version));
  const dispatch = useCallback((event: SessionEvent) => {
    if (onSaveEvent) {
      if (savingLock.current) return;
      const request = retry.current || { requestId: crypto.randomUUID(), revision: revision.current, event };
      const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      retry.current = request;
      savingLock.current = true; setSaving(true); setSaveError(""); setSaveFeedback("");
      void onSaveEvent(request.requestId, request.revision, request.event).then(result => {
        if (!result.ok) { setSaveError(result.error); return; }
        revision.current = result.value.revision;
        retry.current = null;
        if (request.event.type === "restart" || request.event.type === "start") expirationRequested.current = false;
        setSession(restoreStored(result.value));
        setSaveFeedback(result.value.status === "expired" ? "Prazo encerrado. Últimas respostas confirmadas preservadas na sua conta." : "Alteração salva na sua conta.");
      }).catch(() => setSaveError("Não foi possível confirmar a gravação. Tente novamente antes de sair.")).finally(() => {
        savingLock.current = false; setSaving(false);
        requestAnimationFrame(() => {
          if (document.activeElement !== document.body) return;
          if (focused?.isConnected) focused.focus();
          else if (request.event.type === "restart") timerControl.current?.focus();
        });
      });
      return;
    }
    const now = performance.now();
    setSession((previous) => transitionSession(previous, event, plan, questions, now));
  }, [plan, questions, onSaveEvent]);
  const expire = useCallback(() => {
    if (onSaveEvent && expirationRequested.current) return;
    if (onSaveEvent) {
      if (savingLock.current) return;
      expirationRequested.current = true;
      setSession(previous => transitionSession(previous, { type: "tick" }, plan, questions, performance.now()));
    }
    dispatch({ type: "tick" });
  }, [dispatch, onSaveEvent, plan, questions]);
  const question = orderedQuestions[currentIndex];

  if (!question || orderedQuestions.some((item) => !item)) {
    return <main id="main-content" className="configuration-notice"><h1>Esta sessão está incompleta.</h1><p>Não foi possível localizar todas as versões das questões.</p><Link href="/">Voltar ao dashboard</Link></main>;
  }

  const answer = session.answers[question.id];
  const answered = Object.values(session.answers).filter((item) => item.optionId !== null).length;
  const marked = Object.values(session.answers).filter((item) => item.markedForReview).length;
  const skill = skills.find((item) => item.id === question.skillId);
  const editable = session.status === "running" && !saving && !saveError;
  const control = session.status === "running"
    ? { label: "Pausar", event: "pause" as const, Icon: Pause }
    : session.status === "paused"
      ? { label: "Retomar", event: "resume" as const, Icon: Play }
      : { label: "Iniciar sessão", event: "start" as const, Icon: Play };
  const moveTo = (index: number) => {
    setCurrentIndex(index);
    requestAnimationFrame(() => questionHeading.current?.focus());
  };

  return <div className={styles.simulator}>
    <a href="#main-content" className="skip-link">Ir para a questão</a>
    <header className={styles.header}>
      <Link href="/" className={styles.wordmark} aria-label="SAT Study OS — dashboard"><span>SAT<span className={styles.brandDot}>.</span></span><small>STUDY OS</small></Link>
      <div className={styles.headerContext}><span>ESPAÇO DE PRÁTICA</span><strong>Reading and Writing</strong></div>
      <div className={styles.headerActions}>
        <Button asChild variant="ghost" className={styles.backButton}><Link href="/" aria-label="Voltar ao dashboard"><ArrowLeft size={16} aria-hidden="true" /><span className={styles.backLabel}>Dashboard</span></Link></Button>
        <ThemeToggle />
      </div>
    </header>

    <main id="main-content" className={styles.main}>
      <div className={styles.titleRow}>
        <div><p className={styles.sectionEyebrow}>SESSÃO CURTA EXPERIMENTAL{!onSaveEvent && " · DADOS DE DESENVOLVIMENTO"}</p><h1>Um texto. Um raciocínio de cada vez.</h1><p className={styles.intro}>{plan.questions.length} questões originais · {plan.durationSeconds / 60} minutos · Sem adaptação ou correção real</p></div>
        <SessionClock key={session.status} session={session} onExpire={expire} />
      </div>

      <div className={styles.sessionBar}>
        <p role="status" className={styles.status}><span className={`${styles.statusDot} ${editable ? styles.statusDotRunning : ""}`} />{onSaveEvent && session.status === "running" ? "Sessão vinculada à sua conta · O prazo continua ao recarregar." : sessionHint[session.status]}</p>
        <div className={styles.timerActions}>
          <Button ref={timerControl} variant={editable ? "secondary" : "default"} disabled={session.status === "expired" || saving || Boolean(saveError)} onClick={() => dispatch({ type: control.event })}>
            <control.Icon size={16} aria-hidden="true" />{session.status === "expired" ? "Tempo encerrado" : control.label}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="ghost" disabled={session.status === "idle" || saving || Boolean(saveError)}><RotateCcw size={16} aria-hidden="true" />Reiniciar</Button></AlertDialogTrigger>
            <AlertDialogContent onCloseAutoFocus={(event) => {
              if (restarting.current) {
                event.preventDefault();
                restarting.current = false;
                requestAnimationFrame(() => timerControl.current?.focus());
              }
            }}>
              <AlertDialogHeader><AlertDialogTitle>Recomeçar esta sessão?</AlertDialogTitle><AlertDialogDescription>As respostas e marcações serão apagadas, e o cronômetro voltará ao início. A nova sessão aguardará você iniciar.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Continuar aqui</AlertDialogCancel><AlertDialogAction onClick={() => { restarting.current = true; dispatch({ type: "restart" }); setCurrentIndex(0); }}>Reiniciar sessão</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {onSaveEvent && <div className={styles.developmentNote}>
        {saving && <p role="status">Salvando ação… Aguarde a confirmação antes de sair.</p>}
        {saveFeedback && <p role="status">{saveFeedback}</p>}
        {saveError && <div><p role="alert">{saveError}</p><Button variant="outline" onClick={() => retry.current && dispatch(retry.current.event)} disabled={saving}>Tentar salvar novamente</Button> <a href="/simulador">Recarregar estado confirmado</a></div>}
      </div>}

      <article className={styles.questionPanel}>
        <div className={styles.questionBar}>
          <h2 ref={questionHeading} tabIndex={-1} className={styles.questionNumber}>Questão <span>{String(currentIndex + 1).padStart(2, "0")}</span><small>de {String(plan.questions.length).padStart(2, "0")}</small></h2>
          <span className={styles.skillLabel}>{skill?.name || "Reading and Writing"}</span>
        </div>
        <QuestionContent key={question.id} question={question} answer={answer} editable={editable}
          onSelect={(optionId) => dispatch({ type: "select", questionId: question.id, optionId })}
          onToggleReview={() => dispatch({ type: "toggle-review", questionId: question.id })} />
        <footer className={styles.questionFooter}>
          <Button variant="outline" disabled={currentIndex === 0} onClick={() => moveTo(currentIndex - 1)}><ArrowLeft size={16} aria-hidden="true" />Anterior</Button>
          <span className={styles.footerHint}>{answer.optionId ? onSaveEvent ? "Alternativa confirmada na sua conta" : "Alternativa selecionada · apenas nesta aba" : "Uma escolha de cada vez."}</span>
          <Button disabled={currentIndex === plan.questions.length - 1} onClick={() => moveTo(currentIndex + 1)}>Próxima<ArrowRight size={16} aria-hidden="true" /></Button>
        </footer>
      </article>

      <nav className={styles.questionMap} aria-label="Mapa de questões">
        <div className={styles.mapHeading}><List size={18} aria-hidden="true" /><h2>Seu percurso</h2><p>{answered}/{plan.questions.length} respondidas · {marked} para revisão</p></div>
        <div className={styles.mapNumbers}>{plan.questions.map((ref, index) => {
          const item = session.answers[ref.id];
          return <button type="button" key={ref.id} onClick={() => moveTo(index)} aria-current={index === currentIndex ? "step" : undefined}
            aria-label={`Questão ${index + 1}, ${item.optionId ? "respondida" : "não respondida"}${item.markedForReview ? ", marcada para revisão" : ""}`}
            className={`${styles.mapNumber} ${item.optionId ? styles.mapAnswered : ""} ${index === currentIndex ? styles.mapCurrent : ""}`}>
            {index + 1}{item.markedForReview && <Bookmark size={11} fill="currentColor" className={styles.mapMark} aria-hidden="true" />}
          </button>;
        })}</div>
        <p className={styles.mapLegend}><span><i className={styles.legendAnswered} />Respondida</span><span><Bookmark size={13} aria-hidden="true" />Revisar</span><span><i className={styles.legendCurrent} />Atual</span></p>
      </nav>
      <p className={styles.developmentNote}>{onSaveEvent ? "Respostas, marcações e cronômetro são preservados após confirmação. O servidor controla o prazo. Esta sessão ainda não gera correção, nota ou resultado no histórico; para correção com reflexão, use o banco de questões." : "Ambiente de desenvolvimento. Esta sessão não gera nota, histórico ou confirmação de salvamento."} A pausa demonstrativa não representa as regras de uma aplicação oficial do SAT.</p>
    </main>
  </div>;
}
