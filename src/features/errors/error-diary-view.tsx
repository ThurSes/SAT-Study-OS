"use client";

import { useRef, useState, type FormEvent } from "react";
import { BookOpen, Check } from "lucide-react";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { formatCivilDate, toStudyDate } from "@/lib/format-date";
import { SECTION_LABELS } from "@/lib/sat/taxonomy";
import type { ErrorRecord, SaveResult, Skill } from "@/types/domain";
import styles from "@/features/workspace/workspace.module.css";

const CAUSES: Record<ErrorRecord["cause"], string> = {
  concept: "Conteúdo", reading: "Interpretação", attention: "Falta de atenção", unknown: "Ainda não sei",
};
const CURRENT_CAUSES = ["reading", "concept", "attention", "unknown"] as const;

function ErrorReview({ record, skill, reviewedHere, onReflect, onReview, persistent, saving }: {
  record: ErrorRecord; skill: Skill | undefined; reviewedHere: boolean;
  onReflect: (reflection: string, cause: ErrorRecord["cause"]) => void;
  onReview: () => void;
  persistent: boolean; saving: boolean;
}) {
  const [reflection, setReflection] = useState(record.reflection);
  const [cause, setCause] = useState(record.cause);
  function applyReflection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onReflect(reflection.trim(), cause);
  }
  return <article className={styles.panel}>
    <p className={styles.kicker}>{skill ? SECTION_LABELS[skill.section] : "Prática"} · {skill?.name}</p>
    <h2>{skill?.name || "Revisão de uma tentativa"}</h2>
    <p className={styles.muted}>{record.reflection || "Ainda sem reflexão. Abra o registro para anotar o que pode mudar na próxima tentativa."}</p>
    <div className={styles.meta}><span>Causa: {CAUSES[record.cause]}</span><span>{reviewedHere ? persistent ? "Revisado hoje" : "Revisado nesta página" : `Revisão prevista: ${formatCivilDate(record.reviewDueDate)}`}</span></div>
    <details className={styles.details}>
      <summary id={`error-summary-${record.id}`}>Revisar erro de {skill?.name || "prática"}</summary>
      <p className={styles.muted}>Questão de uma tentativa concluída · versão {record.question.version}{persistent ? " · conteúdo original." : " · exemplo original de desenvolvimento."}</p>
      <p lang="en" className={styles.passage}>{record.questionText}</p>
      <div className={styles.reviewAnswer}><strong>Sua resposta na tentativa</strong><p lang="en">{record.givenAnswer}</p></div>
      <div className={styles.reviewAnswer}><strong>Resposta correta</strong><p lang="en">{record.correctAnswer}</p></div>
      <div className={styles.note}><p className={styles.kicker}>Entenda o raciocínio</p><p lang="en" className={styles.passage}>{record.explanation}</p></div>
      <form className={styles.form} onSubmit={applyReflection}>
        <div className={`${styles.field} ${styles.full}`}><label htmlFor={`cause-${record.id}`}>Causa do erro</label><select disabled={saving} id={`cause-${record.id}`} value={cause} onChange={(event) => setCause(event.target.value as ErrorRecord["cause"])}>{!CURRENT_CAUSES.includes(cause as typeof CURRENT_CAUSES[number]) && <option value={cause}>{CAUSES[cause]}</option>}{CURRENT_CAUSES.map(value => <option key={value} value={value}>{CAUSES[value]}</option>)}</select></div>
        <div className={`${styles.field} ${styles.full}`}><label htmlFor={`reflection-${record.id}`}>O que vou fazer diferente?</label><textarea disabled={saving} id={`reflection-${record.id}`} value={reflection} onChange={(event) => setReflection(event.target.value)} maxLength={2000} /></div>
        <div className={`${styles.actions} ${styles.full}`}><Button disabled={saving} type="submit" variant="outline">{persistent ? "Salvar reflexão" : "Aplicar reflexão local"}</Button></div>
      </form>
      <div className={styles.actions}><Button onClick={onReview} disabled={reviewedHere || saving}><Check size={16} aria-hidden="true" />{reviewedHere ? persistent ? "Revisão registrada" : "Revisado nesta página" : "Marcar como revisado"}</Button></div>
      <p className={styles.muted}>{persistent ? "A revisão é registrada na sua conta." : "A revisão é local."} A agenda original é preservada; o reagendamento automático ainda não está integrado.</p>
      <ul className={styles.reviewList} aria-label="Histórico de revisões">{record.reviews.length ? record.reviews.map((review) => <li key={review.id}>Revisão registrada em <time dateTime={review.reviewedAt}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(review.reviewedAt))}</time>{persistent ? "" : reviewedHere && review.id === record.reviews.at(-1)?.id ? " · apenas nesta página" : " · exemplo"}</li>) : <li>Nenhuma revisão registrada.</li>}</ul>
      <p className={styles.muted}>A resposta da tentativa original é preservada, mesmo quando você altera sua reflexão.</p>
    </details>
  </article>;
}

export function ErrorDiaryView({ initialRecords, skills, referenceDate, onSaveReflection, onReview, developmentData = true }: {
  initialRecords: readonly ErrorRecord[]; skills: readonly Skill[]; referenceDate: string;
  onSaveReflection?: (id: string, cause: ErrorRecord["cause"], reflection: string) => Promise<SaveResult<ErrorRecord>>;
  onReview?: (id: string, eventId: string) => Promise<SaveResult<ErrorRecord>>;
  developmentData?: boolean;
}) {
  const [entries, setEntries] = useState(() => initialRecords.map((record) => ({ record, reviewedHere: Boolean(onReview) && record.reviews.some(review => toStudyDate(review.reviewedAt) === referenceDate) })));
  const [query, setQuery] = useState("");
  const [cause, setCause] = useState("all");
  const [status, setStatus] = useState("all");
  const [feedback, setFeedback] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const reviewIds = useRef<Record<string, string>>({});
  const statusSelect = useRef<HTMLSelectElement>(null);
  function matchesFilters(entry: (typeof entries)[number]) {
    const skill = skills.find((item) => item.id === entry.record.skillId);
    return (cause === "all" || entry.record.cause === cause) &&
      (status === "all" || (status === "reviewed" ? entry.reviewedHere : !entry.reviewedHere && entry.record.reviewDueDate <= referenceDate)) &&
      `${skill?.name || ""} ${entry.record.reflection} ${entry.record.questionText}`.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"));
  }
  const visible = entries.filter(matchesFilters);
  async function reflect(id: string, reflection: string, newCause: ErrorRecord["cause"]) {
    if (saveLock.current) return;
    const entry = entries.find((item) => item.record.id === id);
    if (!entry) return;
    let record = { ...entry.record, reflection, cause: newCause };
    if (onSaveReflection) {
      saveLock.current = true; setSaving(true); setSaveError("");
      try { const result = await onSaveReflection(id, newCause, reflection); if (!result.ok) { setSaveError(result.error); return; } record = result.value; }
      catch { setSaveError("Não foi possível salvar. Sua reflexão foi preservada para tentar novamente."); return; }
      finally { saveLock.current = false; setSaving(false); }
    }
    const updated = { ...entry, record };
    if (!matchesFilters(updated)) {
      document.getElementById(cause !== "all" && cause !== newCause ? "errors-cause" : "errors-search")?.focus();
    }
    setEntries((previous) => previous.map((item) => item.record.id === id ? updated : item));
    setFeedback(onSaveReflection ? "Reflexão e causa salvas na sua conta." : "Reflexão aplicada apenas nesta página. Não foi gravada no banco.");
  }
  async function review(id: string) {
    if (saveLock.current) return;
    const event = { id: reviewIds.current[id] ??= crypto.randomUUID(), reviewedAt: new Date().toISOString() };
    let saved: ErrorRecord | null = null;
    if (onReview) {
      saveLock.current = true; setSaving(true); setSaveError("");
      try { const result = await onReview(id, event.id); if (!result.ok) { setSaveError(result.error); return; } saved = result.value; }
      catch { setSaveError("Não foi possível confirmar a revisão. Tente novamente."); return; }
      finally { saveLock.current = false; setSaving(false); }
    }
    if (status === "due") statusSelect.current?.focus();
    else requestAnimationFrame(() => document.getElementById(`error-summary-${id}`)?.focus());
    setEntries((previous) => previous.map((entry) => entry.record.id !== id || entry.reviewedHere ? entry : {
      reviewedHere: true,
      record: saved || { ...entry.record, reviews: [...entry.record.reviews, event] },
    }));
    setFeedback(onReview ? "Revisão registrada na sua conta. A resposta original foi preservada." : "Revisão marcada apenas nesta página. A resposta original e a agenda de exemplo foram preservadas.");
  }
  return <div>
    <PageIntro developmentData={developmentData} eyebrow="Revisão / Diário de erros" title="Um erro pode virar direção." description="Revisite tentativas concluídas, entenda a causa e anote uma próxima ação concreta." />
    <p className={styles.note}><BookOpen size={16} aria-hidden="true" /> {onReview ? "Revise suas tentativas concluídas. " : "Revise exemplos de tentativas concluídas. "}Referência da agenda: {formatCivilDate(referenceDate)}.</p>
    {saveError && <p role="alert" className={styles.error}>{saveError}</p>}
    {saving && <p role="status">Salvando alteração…</p>}
    <div className={styles.toolbar}>
      <div className={`${styles.field} ${styles.search}`}><label htmlFor="errors-search">Buscar no diário</label><input id="errors-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Habilidade, reflexão ou questão" /></div>
      <div className={`${styles.field} ${styles.filter}`}><label htmlFor="errors-cause">Filtrar por causa</label><select id="errors-cause" value={cause} onChange={(event) => setCause(event.target.value)}><option value="all">Todas as causas</option>{Object.entries(CAUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className={`${styles.field} ${styles.filter}`}><label htmlFor="errors-status">Filtrar revisões</label><select ref={statusSelect} id="errors-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos os registros</option><option value="due">{onReview ? "Revisões pendentes" : "Pendentes no cenário"}</option><option value="reviewed">{onReview ? "Revisados hoje" : "Revisados nesta página"}</option></select></div>
    </div>
    <p className={styles.count} role="status">{visible.length} de {entries.length} registros · {entries.filter((entry) => entry.reviewedHere).length} {onReview ? "revisados hoje" : "revisados nesta página"}</p>
    <p role="status" className={styles.feedback}>{feedback}</p>
    {visible.length ? <div className={styles.grid}>{visible.map((entry) => <ErrorReview key={entry.record.id} record={entry.record} reviewedHere={entry.reviewedHere} skill={skills.find((skill) => skill.id === entry.record.skillId)} persistent={Boolean(onSaveReflection)} saving={saving}
      onReflect={(reflection, newCause) => reflect(entry.record.id, reflection, newCause)}
      onReview={() => review(entry.record.id)} />)}</div> : <div className={styles.empty}><h2>Nenhum erro neste recorte.</h2><p>Experimente outra habilidade, causa ou situação de revisão.</p><Button variant="outline" onClick={() => { setQuery(""); setCause("all"); setStatus("all"); }}>Limpar filtros</Button></div>}
  </div>;
}
