"use client";

import { useState, type FormEvent } from "react";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { buildExternalAssessment } from "@/lib/sat/assessments";
import { formatCivilDate } from "@/lib/format-date";
import type { AssessmentResult } from "@/types/domain";
import styles from "@/features/workspace/workspace.module.css";

const ORIGIN_LABELS: Record<AssessmentResult["origin"], string> = {
  official_self_reported: "Nota oficial · autodeclarada",
  printed_estimate: "Estimativa · material impresso",
  experimental: "Sessão experimental",
};

function AssessmentCard({ result }: { result: AssessmentResult }) {
  return <article className={styles.panel}>
    <div className={styles.row}>
      <div><p className={styles.kicker}>{ORIGIN_LABELS[result.origin]}</p><h2>{result.title}</h2><p className={styles.muted}><time dateTime={result.date}>{formatCivilDate(result.date)}</time></p></div>
      <p className={styles.score}>{result.origin === "experimental" ? `${result.correct}/${result.total}` : result.readingWriting + result.math}<span>{result.origin === "experimental" ? "acertos · sem escala SAT" : "pontos informados"}</span></p>
    </div>
    <details className={styles.details}>
      <summary>Detalhes de {result.title}</summary>
      {result.origin === "experimental" ? <p className={styles.muted}>{result.durationSeconds === null ? "Tempo não informado." : `Tempo de sessão: ${Math.floor(result.durationSeconds / 60)} min ${result.durationSeconds % 60} s.`} Este desempenho não representa uma nota oficial do SAT.</p> : <div className={styles.meta}><span>Reading and Writing: {result.readingWriting}</span><span>Math: {result.math}</span></div>}
      {result.origin === "official_self_reported" && <p className={styles.muted}>Resultado informado pelo usuário; a origem oficial não foi verificada pelo sistema.</p>}
      {result.origin === "printed_estimate" && <><p className={styles.muted}><strong>Material:</strong> {result.material}</p><p className={styles.muted}><strong>Método de conversão:</strong> {result.conversionMethod}</p></>}
      <p className={styles.muted}>{result.notes || "Sem observações neste registro."}</p>
    </details>
  </article>;
}

export function HistoryView({ initialResults }: { initialResults: readonly AssessmentResult[] }) {
  const [results, setResults] = useState(initialResults);
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [newOrigin, setNewOrigin] = useState("official_self_reported");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const invalidPeriod = from && to && from > to;
  const visible = invalidPeriod ? [] : results.filter((result) =>
    (origin === "all" || result.origin === origin) && (!from || result.date >= from) && (!to || result.date <= to) &&
    `${result.title} ${result.notes || ""}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR").trim())
  ).toSorted((first, second) => second.date.localeCompare(first.date));

  function addAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const field = (name: string) => String(data.get(name) ?? "");
    const outcome = buildExternalAssessment({
      title: field("title"), date: field("date"), origin: field("origin"),
      readingWriting: field("rw"), math: field("math"), material: field("material"),
      conversionMethod: field("conversion"), notes: field("notes"),
    }, crypto.randomUUID());
    if (!outcome.ok) { setError(outcome.error); setFeedback(""); return; }
    setResults((previous) => [outcome.assessment, ...previous]);
    setQuery(""); setOrigin("all"); setFrom(""); setTo(""); setError("");
    setFeedback("Avaliação incluída apenas nesta página. Recarregar ou sair descarta o registro; não houve gravação no banco.");
    form.reset();
    setNewOrigin("official_self_reported");
  }

  return <div>
    <PageIntro eyebrow="Trajetória / Avaliações" title="Sua trajetória, com contexto." description="Cada resultado tem uma origem. Compare sua prática sem misturar acertos com pontuações." />
    <details className={styles.disclosure}>
      <summary>Adicionar avaliação externa</summary>
      <p className={styles.muted}>Experimente registrar uma nota autodeclarada ou estimativa de material impresso. O registro é local e temporário.</p>
      <form className={styles.form} onSubmit={addAssessment} aria-describedby={error ? "assessment-error" : undefined}>
        <div className={`${styles.field} ${styles.full}`}><label htmlFor="assessment-title">Nome da avaliação</label><input id="assessment-title" name="title" required maxLength={120} placeholder="Ex.: avaliação de outubro" /></div>
        <div className={styles.field}><label htmlFor="assessment-date">Data da avaliação</label><input id="assessment-date" name="date" type="date" required /></div>
        <div className={styles.field}><label htmlFor="assessment-origin">Origem do novo registro</label><select id="assessment-origin" name="origin" value={newOrigin} onChange={(event) => setNewOrigin(event.target.value)}><option value="official_self_reported">Nota oficial autodeclarada</option><option value="printed_estimate">Estimativa de material impresso</option></select></div>
        <div className={styles.field}><label htmlFor="assessment-rw">Reading and Writing (200–800)</label><input id="assessment-rw" name="rw" type="number" min={200} max={800} step={1} required inputMode="numeric" /></div>
        <div className={styles.field}><label htmlFor="assessment-math">Math (200–800)</label><input id="assessment-math" name="math" type="number" min={200} max={800} step={1} required inputMode="numeric" /></div>
        {newOrigin === "printed_estimate" && <>
          <div className={`${styles.field} ${styles.full}`}><label htmlFor="assessment-material">Material e edição</label><input id="assessment-material" name="material" required maxLength={160} /></div>
          <div className={`${styles.field} ${styles.full}`}><label htmlFor="assessment-conversion">Método de conversão utilizado</label><input id="assessment-conversion" name="conversion" required maxLength={300} placeholder="Informe a tabela e o procedimento do material" /></div>
        </>}
        <div className={`${styles.field} ${styles.full}`}><label htmlFor="assessment-notes">Observações (opcional)</label><textarea id="assessment-notes" name="notes" maxLength={2000} /></div>
        {error && <p id="assessment-error" role="alert" className={`${styles.error} ${styles.full}`}>{error}</p>}
        <div className={`${styles.actions} ${styles.full}`}><Button type="submit">Adicionar nesta página</Button><p className={styles.muted}>O total é a soma das duas seções.</p></div>
      </form>
    </details>
    <p role="status" className={styles.feedback}>{feedback}</p>
    <div className={styles.toolbar}>
      <div className={`${styles.field} ${styles.search}`}><label htmlFor="history-search">Buscar avaliações</label><input id="history-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome ou observação" /></div>
      <div className={`${styles.field} ${styles.filter}`}><label htmlFor="history-origin">Filtrar por origem</label><select id="history-origin" value={origin} onChange={(event) => setOrigin(event.target.value)}><option value="all">Todas as origens</option>{Object.entries(ORIGIN_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className={`${styles.field} ${styles.filter}`}><label htmlFor="history-from">De</label><input id="history-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-describedby={invalidPeriod ? "history-period-error" : undefined} aria-invalid={!!invalidPeriod} /></div>
      <div className={`${styles.field} ${styles.filter}`}><label htmlFor="history-to">Até</label><input id="history-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-describedby={invalidPeriod ? "history-period-error" : undefined} aria-invalid={!!invalidPeriod} /></div>
    </div>
    {invalidPeriod && <p id="history-period-error" role="alert" className={styles.error}>A data inicial deve ser anterior ou igual à final.</p>}
    <p className={styles.count} role="status">{visible.length} de {results.length} avaliações · origens preservadas</p>
    {visible.length ? <div className={styles.grid}>{visible.map((result) => <AssessmentCard key={result.id} result={result} />)}</div> : <div className={styles.empty}><h2>Nenhuma avaliação neste recorte.</h2><p>Altere a busca, a origem ou o período para encontrar outros registros.</p><Button variant="outline" onClick={() => { setQuery(""); setOrigin("all"); setFrom(""); setTo(""); }}>Limpar filtros</Button></div>}
  </div>;
}
