"use client";

import { useRef, useState, type FormEvent } from "react";
import { BookOpen, Check } from "lucide-react";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { formatCivilDate } from "@/lib/format-date";
import { SECTION_LABELS } from "@/lib/sat/taxonomy";
import type { ErrorRecord, Skill } from "@/types/domain";
import styles from "@/features/workspace/workspace.module.css";

const CAUSES: Record<ErrorRecord["cause"], string> = {
  concept: "Conceito", reading: "Leitura", calculation: "Cálculo", time: "Tempo", guess: "Chute", unknown: "Ainda não sei",
};

function ErrorReview({ record, skill, reviewedHere, onReflect, onReview }: {
  record: ErrorRecord; skill: Skill | undefined; reviewedHere: boolean;
  onReflect: (reflection: string, cause: ErrorRecord["cause"]) => void;
  onReview: () => void;
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
    <div className={styles.meta}><span>Causa: {CAUSES[record.cause]}</span><span>{reviewedHere ? "Revisado nesta página" : `Revisão prevista: ${formatCivilDate(record.reviewDueDate)}`}</span></div>
    <details className={styles.details}>
      <summary id={`error-summary-${record.id}`}>Revisar erro de {skill?.name || "prática"}</summary>
      <p className={styles.muted}>Questão de uma tentativa concluída · versão {record.question.version} · exemplo original de desenvolvimento.</p>
      <p lang="en" className={styles.passage}>{record.questionText}</p>
      <div className={styles.reviewAnswer}><strong>Sua resposta na tentativa</strong><p lang="en">{record.givenAnswer}</p></div>
      <div className={styles.reviewAnswer}><strong>Resposta correta</strong><p lang="en">{record.correctAnswer}</p></div>
      <div className={styles.note}><p className={styles.kicker}>Entenda o raciocínio</p><p lang="en" className={styles.passage}>{record.explanation}</p></div>
      <form className={styles.form} onSubmit={applyReflection}>
        <div className={`${styles.field} ${styles.full}`}><label htmlFor={`cause-${record.id}`}>Causa do erro</label><select id={`cause-${record.id}`} value={cause} onChange={(event) => setCause(event.target.value as ErrorRecord["cause"])}>{Object.entries(CAUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className={`${styles.field} ${styles.full}`}><label htmlFor={`reflection-${record.id}`}>O que vou fazer diferente?</label><textarea id={`reflection-${record.id}`} value={reflection} onChange={(event) => setReflection(event.target.value)} maxLength={2000} /></div>
        <div className={`${styles.actions} ${styles.full}`}><Button type="submit" variant="outline">Aplicar reflexão local</Button></div>
      </form>
      <div className={styles.actions}><Button onClick={onReview} disabled={reviewedHere}><Check size={16} aria-hidden="true" />{reviewedHere ? "Revisado nesta página" : "Marcar como revisado"}</Button></div>
      <p className={styles.muted}>A revisão é local. A agenda original é preservada; o reagendamento automático ainda não está integrado.</p>
      <ul className={styles.reviewList} aria-label="Histórico de revisões">{record.reviews.length ? record.reviews.map((review) => <li key={review.id}>Revisão registrada em <time dateTime={review.reviewedAt}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(review.reviewedAt))}</time>{reviewedHere && review.id === record.reviews.at(-1)?.id ? " · apenas nesta página" : " · exemplo"}</li>) : <li>Nenhuma revisão neste exemplo.</li>}</ul>
      <p className={styles.muted}>A resposta da tentativa original é preservada, mesmo quando você altera sua reflexão.</p>
    </details>
  </article>;
}

export function ErrorDiaryView({ initialRecords, skills, referenceDate }: {
  initialRecords: readonly ErrorRecord[]; skills: readonly Skill[]; referenceDate: string;
}) {
  const [entries, setEntries] = useState(() => initialRecords.map((record) => ({ record, reviewedHere: false })));
  const [query, setQuery] = useState("");
  const [cause, setCause] = useState("all");
  const [status, setStatus] = useState("all");
  const [feedback, setFeedback] = useState("");
  const statusSelect = useRef<HTMLSelectElement>(null);
  function matchesFilters(entry: (typeof entries)[number]) {
    const skill = skills.find((item) => item.id === entry.record.skillId);
    return (cause === "all" || entry.record.cause === cause) &&
      (status === "all" || (status === "reviewed" ? entry.reviewedHere : !entry.reviewedHere && entry.record.reviewDueDate <= referenceDate)) &&
      `${skill?.name || ""} ${entry.record.reflection} ${entry.record.questionText}`.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"));
  }
  const visible = entries.filter(matchesFilters);
  function reflect(id: string, reflection: string, newCause: ErrorRecord["cause"]) {
    const entry = entries.find((item) => item.record.id === id);
    if (!entry) return;
    const updated = { ...entry, record: { ...entry.record, reflection, cause: newCause } };
    if (!matchesFilters(updated)) {
      document.getElementById(cause !== "all" && cause !== newCause ? "errors-cause" : "errors-search")?.focus();
    }
    setEntries((previous) => previous.map((item) => item.record.id === id ? { ...item, record: { ...item.record, reflection, cause: newCause } } : item));
    setFeedback("Reflexão aplicada apenas nesta página. Não foi gravada no banco.");
  }
  function review(id: string) {
    const event = { id: crypto.randomUUID(), reviewedAt: new Date().toISOString() };
    if (status === "due") statusSelect.current?.focus();
    else requestAnimationFrame(() => document.getElementById(`error-summary-${id}`)?.focus());
    setEntries((previous) => previous.map((entry) => entry.record.id !== id || entry.reviewedHere ? entry : {
      reviewedHere: true,
      record: { ...entry.record, reviews: [...entry.record.reviews, event] },
    }));
    setFeedback("Revisão marcada apenas nesta página. A resposta original e a agenda de exemplo foram preservadas.");
  }
  return <div>
    <PageIntro eyebrow="Revisão / Diário de erros" title="Um erro pode virar direção." description="Revisite tentativas concluídas, entenda a causa e anote uma próxima ação concreta." />
    <p className={styles.note}><BookOpen size={16} aria-hidden="true" /> Revise exemplos de tentativas concluídas. Referência da agenda de exemplo: {formatCivilDate(referenceDate)}.</p>
    <div className={styles.toolbar}>
      <div className={`${styles.field} ${styles.search}`}><label htmlFor="errors-search">Buscar no diário</label><input id="errors-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Habilidade, reflexão ou questão" /></div>
      <div className={`${styles.field} ${styles.filter}`}><label htmlFor="errors-cause">Filtrar por causa</label><select id="errors-cause" value={cause} onChange={(event) => setCause(event.target.value)}><option value="all">Todas as causas</option>{Object.entries(CAUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className={`${styles.field} ${styles.filter}`}><label htmlFor="errors-status">Filtrar revisões</label><select ref={statusSelect} id="errors-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos os registros</option><option value="due">Pendentes no cenário</option><option value="reviewed">Revisados nesta página</option></select></div>
    </div>
    <p className={styles.count} role="status">{visible.length} de {entries.length} registros · {entries.filter((entry) => entry.reviewedHere).length} revisados nesta página</p>
    <p role="status" className={styles.feedback}>{feedback}</p>
    {visible.length ? <div className={styles.grid}>{visible.map((entry) => <ErrorReview key={entry.record.id} record={entry.record} reviewedHere={entry.reviewedHere} skill={skills.find((skill) => skill.id === entry.record.skillId)}
      onReflect={(reflection, newCause) => reflect(entry.record.id, reflection, newCause)}
      onReview={() => review(entry.record.id)} />)}</div> : <div className={styles.empty}><h2>Nenhum erro neste recorte.</h2><p>Experimente outra habilidade, causa ou situação de revisão.</p><Button variant="outline" onClick={() => { setQuery(""); setCause("all"); setStatus("all"); }}>Limpar filtros</Button></div>}
  </div>;
}
