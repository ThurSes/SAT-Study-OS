"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { ErrorCause, ErrorRecord, PracticeFeedback, PracticeSubmission, Question, SaveResult } from "@/types/domain";
import styles from "@/features/workspace/workspace.module.css";

export interface PracticeActions {
  readonly onSubmitAnswer?: (input: PracticeSubmission) => Promise<SaveResult<PracticeFeedback>>;
  readonly onSaveReflection?: (errorId: string, cause: ErrorCause, reflection: string) => Promise<SaveResult<ErrorRecord>>;
}

export function PracticeCard({ question, onSubmitAnswer, onSaveReflection }: { question: Question } & PracticeActions) {
  const [selected, setSelected] = useState("");
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [answerError, setAnswerError] = useState("");
  const [cause, setCause] = useState<ErrorCause>("unknown");
  const [reflection, setReflection] = useState("");
  const [savingReflection, setSavingReflection] = useState(false);
  const [reflectionError, setReflectionError] = useState("");
  const [reflectionMessage, setReflectionMessage] = useState("");
  const requestId = useRef<string | null>(null);
  const answerPending = useRef(false);
  const reflectionPending = useRef(false);
  const prefix = `practice-${question.id}-${question.version}`;

  async function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onSubmitAnswer || !selected || feedback || answerPending.current) return;
    answerPending.current = true;
    setSavingAnswer(true);
    setAnswerError("");
    requestId.current ??= crypto.randomUUID();
    try {
      const result = await onSubmitAnswer({ requestId: requestId.current, question: { id: question.id, version: question.version }, optionId: selected });
      if (result.ok) setFeedback(result.value);
      else setAnswerError(result.error);
    } catch {
      setAnswerError("Não foi possível confirmar o envio. Sua seleção foi mantida; tente novamente.");
    } finally {
      answerPending.current = false;
      setSavingAnswer(false);
    }
  }

  async function saveReflection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reflectionPending.current) return;
    setReflectionError("");
    setReflectionMessage("");
    if (!onSubmitAnswer) {
      setReflectionMessage("Reflexão mantida apenas nesta página. Será perdida ao sair ou recarregar; nenhuma tentativa foi corrigida.");
      return;
    }
    if (!feedback?.errorId || !onSaveReflection) return;
    reflectionPending.current = true;
    setSavingReflection(true);
    try {
      const result = await onSaveReflection(feedback.errorId, cause, reflection);
      if (result.ok) {
        setCause(result.value.cause);
        setReflection(result.value.reflection);
        setReflectionMessage("Causa e reflexão salvas no diário de erros.");
      } else setReflectionError(result.error);
    } catch {
      setReflectionError("Não foi possível salvar a reflexão. Seu texto foi mantido; tente novamente.");
    } finally {
      reflectionPending.current = false;
      setSavingReflection(false);
    }
  }

  const showReflection = !onSubmitAnswer || (feedback && !feedback.correct);

  return <>
    {onSubmitAnswer && <form onSubmit={submitAnswer} className={styles.details} aria-busy={savingAnswer}>
      <fieldset disabled={savingAnswer || Boolean(feedback) || Boolean(answerError)}>
        <legend className={styles.kicker}>Prática individual · escolha uma alternativa</legend>
        <div className="grid gap-3 mt-4" lang={question.language}>{question.options.map(option => <label key={option.id} className="flex items-start gap-3 rounded border border-[var(--color-border-control)] p-3 cursor-pointer has-[:checked]:border-[var(--color-brand)] has-[:checked]:bg-[var(--color-surface-muted)]">
          <input className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-brand)]" type="radio" name={`${prefix}-answer`} value={option.id} checked={selected === option.id} onChange={() => {
            if (answerPending.current || feedback) return;
            setSelected(option.id); requestId.current = null; setAnswerError("");
          }} required />
          <span className={styles.passage}><strong>{option.label}.</strong> {option.text}</span>
        </label>)}</div>
      </fieldset>
      {!feedback && <div className={styles.actions}><Button type="submit" disabled={!selected || savingAnswer}>{savingAnswer ? "Enviando resposta…" : answerError ? "Tentar envio novamente" : "Enviar resposta"}</Button></div>}
      {answerError && <p className={`${styles.feedback} ${styles.error}`} role="alert">{answerError}</p>}
      {answerError && <p className={styles.muted}>Tente o mesmo envio novamente para confirmar o resultado sem duplicar a tentativa.</p>}
      {savingAnswer && <p className={styles.muted} role="status">Aguardando confirmação. Mantenha esta página aberta.</p>}
    </form>}

    {feedback && <div className={styles.reviewAnswer} role="status">
      <strong>{feedback.correct ? "Resposta correta · tentativa registrada" : "Resposta incorreta · tentativa registrada"}</strong>
      <p className={styles.muted}>A resposta enviada não pode ser alterada nesta tentativa.</p>
      <p lang={question.language}><strong>Resposta correta</strong>{feedback.correctAnswer}</p>
      <p lang={question.language} className="mt-4"><strong>Explicação</strong>{feedback.explanation}</p>
    </div>}

    {showReflection && <details className={styles.details} open={Boolean(feedback)}>
      <summary>{onSubmitAnswer ? "Avaliar a causa do erro" : "Autoavaliação temporária"}</summary>
      {!onSubmitAnswer && <p className={styles.muted}>Se você identificou um erro ao estudar, reflita sobre a causa. Esta consulta não corrige nem registra uma tentativa.</p>}
      {onSubmitAnswer && (!feedback?.errorId || !onSaveReflection) ? <p className={styles.muted}>A classificação está indisponível para esta tentativa. Consulte o diário de erros para revisar o registro.</p> : <form className={styles.form} onSubmit={saveReflection} aria-busy={savingReflection}>
        <div className={`${styles.field} ${styles.full}`}><label htmlFor={`${prefix}-cause`}>Causa percebida do erro</label><select id={`${prefix}-cause`} value={cause} disabled={savingReflection} onChange={event => { setCause(event.target.value as ErrorCause); setReflectionMessage(""); setReflectionError(""); }}>
          <option value="unknown">Ainda não sei</option><option value="reading">Interpretação</option><option value="concept">Conteúdo</option><option value="attention">Falta de atenção</option>
        </select></div>
        <div className={`${styles.field} ${styles.full}`}><label htmlFor={`${prefix}-reflection`}>O que aconteceu e como evitar na próxima vez?</label><textarea id={`${prefix}-reflection`} maxLength={2000} value={reflection} disabled={savingReflection} onChange={event => { setReflection(event.target.value); setReflectionMessage(""); setReflectionError(""); }} /></div>
        <div className={styles.full}><Button type="submit" disabled={savingReflection}>{savingReflection ? "Salvando reflexão…" : onSubmitAnswer ? "Salvar causa e reflexão" : "Manter reflexão nesta página"}</Button></div>
        {reflectionMessage && <p className={`${styles.feedback} ${styles.full}`} role="status">{reflectionMessage}</p>}
        {reflectionError && <p className={`${styles.feedback} ${styles.error} ${styles.full}`} role="alert">{reflectionError}</p>}
      </form>}
    </details>}
  </>;
}
