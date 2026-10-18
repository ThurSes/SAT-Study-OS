"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { DOMAIN_LABELS, SECTION_LABELS } from "@/lib/sat/taxonomy";
import type { LessonProgress, SatDomain, SatSection, SaveResult, StudyLesson } from "@/types/domain";
import { contentSources } from "./content-catalog";
import styles from "../workspace/workspace.module.css";

interface ContentViewProps {
  lessons: readonly StudyLesson[];
  initialProgress?: readonly LessonProgress[];
  onSaveProgress?: (progress: LessonProgress) => Promise<SaveResult<LessonProgress>>;
  developmentData?: boolean;
  progressUnavailable?: boolean;
}

export function ContentView({ lessons, initialProgress = [], onSaveProgress, developmentData = false, progressUnavailable = false }: ContentViewProps) {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<SatSection | "all">("all");
  const [domain, setDomain] = useState<SatDomain | "all">("all");
  const [progress, setProgress] = useState(initialProgress);
  const domains = [...new Set(lessons.filter((item) => section === "all" || item.skill.section === section).map((item) => item.skill.domain))];
  const search = query.trim().toLocaleLowerCase("pt-BR");
  const filtered = lessons.filter((item) => (section === "all" || item.skill.section === section)
    && (domain === "all" || item.skill.domain === domain)
    && [item.title, item.skill.name, DOMAIN_LABELS[item.skill.domain], ...item.objectives, ...item.explanation].join(" ").toLocaleLowerCase("pt-BR").includes(search));
  const completed = lessons.filter((lesson) => progress.some((item) => item.lessonId === lesson.id && item.completed)).length;

  return <>
    <PageIntro eyebrow="Biblioteca de estudo" title="Entenda antes de acelerar." description="Aulas em português, exemplos resolvidos e pontos de atenção para os oito domínios do SAT. Escolha uma habilidade e estude com intenção." developmentData={developmentData} />
    <p className={styles.note}>Material autoral de estudo, organizado pelas habilidades públicas do College Board. Os exemplos são didáticos e independentes das questões de treino. Concluir uma aula registra sua leitura; não mede domínio nem gera nota SAT.</p>
    {progressUnavailable && <p role="alert" className={styles.note}>Não foi possível carregar seu progresso. A leitura continua disponível; recarregue a página para tentar retomar o salvamento. Aulas não serão tratadas como não estudadas por causa desta falha.</p>}
    {!onSaveProgress && !developmentData && !progressUnavailable && <p className={styles.note}><Link href="/login?next=/conteudos">Entre na sua conta</Link> para salvar notas e aulas concluídas. Você pode ler todo o conteúdo sem login.</p>}
    <div className={styles.toolbar} role="search" aria-label="Filtrar conteúdos">
      <div className={`${styles.field} ${styles.search}`}><label htmlFor="content-search">Buscar conteúdo</label><input id="content-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: porcentagem, evidência, funções…" /></div>
      <div className={`${styles.field} ${styles.filter}`}><label htmlFor="content-section">Seção</label><select id="content-section" value={section} onChange={(event) => { setSection(event.target.value as SatSection | "all"); setDomain("all"); }}><option value="all">Todas as seções</option>{Object.entries(SECTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className={`${styles.field} ${styles.filter}`}><label htmlFor="content-domain">Domínio</label><select id="content-domain" value={domain} onChange={(event) => setDomain(event.target.value as SatDomain | "all")}><option value="all">Todos os domínios</option>{domains.map((item) => <option key={item} value={item}>{DOMAIN_LABELS[item]}</option>)}</select></div>
    </div>
    <p className={styles.count} role="status">{filtered.length} de {lessons.length} aulas{(onSaveProgress || developmentData) && <> · {completed} concluídas{developmentData && !onSaveProgress ? " nesta página" : " na sua conta"}</>}.</p>
    {filtered.length === 0 && <div className={styles.empty}><h2>Nenhuma aula encontrada</h2><p>Tente outra palavra ou amplie os filtros.</p><Button variant="outline" onClick={() => { setQuery(""); setSection("all"); setDomain("all"); }}>Limpar filtros</Button></div>}
    {[...new Set(lessons.map(lesson => lesson.skill.domain))].map((item) => <section hidden={!filtered.some(lesson => lesson.skill.domain === item)} key={item} aria-labelledby={`domain-${item}`}>
      <div className={styles.sectionHeading}><h2 id={`domain-${item}`}>{DOMAIN_LABELS[item]}</h2><span className={styles.muted}>{SECTION_LABELS[lessons.find(lesson => lesson.skill.domain === item)!.skill.section]}</span></div>
      <div className={styles.grid}>{lessons.filter(lesson => lesson.skill.domain === item).map(lesson => <div key={lesson.id} hidden={!filtered.includes(lesson)}><LessonCard lesson={lesson} initial={progress.find(item => item.lessonId === lesson.id)} progressUnavailable={progressUnavailable} developmentData={developmentData} onSaveProgress={onSaveProgress} onSaved={value => setProgress(current => [...current.filter(item => item.lessonId !== value.lessonId), value])} /></div>)}</div>
    </section>)}
    <details className={styles.disclosure}><summary>Referências de cobertura</summary><p className={styles.muted}>Taxonomia conferida nas especificações públicas. As explicações e os exemplos desta biblioteca foram escritos para o SAT Study OS; não são questões oficiais.</p><ul className={styles.reviewList}>{contentSources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.title} (abre em nova aba)</a></li>)}</ul></details>
  </>;
}

function LessonCard({ lesson, initial, onSaveProgress, onSaved, developmentData, progressUnavailable }: {
  lesson: StudyLesson; initial?: LessonProgress; developmentData: boolean;
  progressUnavailable: boolean;
  onSaveProgress?: ContentViewProps["onSaveProgress"]; onSaved: (value: LessonProgress) => void;
}) {
  const [draft, setDraft] = useState<LessonProgress>(initial ?? { lessonId: lesson.id, notes: "", completed: false });
  const [saved, setSaved] = useState(initial);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState(false);
  const saving = useRef(false);
  const dirty = draft.notes !== (saved?.notes ?? "") || draft.completed !== (saved?.completed ?? false);
  function edit(value: Partial<LessonProgress>) { setDraft((current) => ({ ...current, ...value })); setFeedback(""); setError(false); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || (!onSaveProgress && !developmentData)) return;
    saving.current = true; setPending(true); setFeedback(""); setError(false);
    try {
      if (onSaveProgress) {
        const result = await onSaveProgress(draft);
        if (!result.ok) { setError(true); setFeedback(result.error); return; }
        setSaved(result.value); setDraft(result.value); onSaved(result.value); setFeedback("Notas e progresso salvos na sua conta.");
      } else { setSaved(draft); onSaved(draft); setFeedback("Progresso aplicado apenas nesta página; será descartado ao sair ou recarregar."); }
    } catch { setError(true); setFeedback("Não foi possível salvar. Suas alterações continuam aqui; tente novamente."); }
    finally { saving.current = false; setPending(false); }
  }
  return <article className={styles.panel} aria-labelledby={`title-${lesson.id}`}>
    <p className={styles.kicker}>{lesson.skill.name}</p>
    <h3 id={`title-${lesson.id}`}>{lesson.title}</h3>
    <div className={styles.meta}><span>Leitura estimada: {lesson.minutes} min</span><span className={`${styles.status} ${saved?.completed ? styles.success : ""}`}>{progressUnavailable ? "Progresso indisponível" : saved?.completed ? "Leitura concluída" : "Para estudar"}</span></div>
    <p className={styles.muted}>{lesson.objectives[0]}</p>
    <details className={styles.details}>
      <summary>Ler aula: {lesson.title}</summary>
      <div className={styles.passage}>
        <h4 className={styles.kicker}>Objetivos</h4><ul className={styles.reviewList}>{lesson.objectives.map((text) => <li key={text}>{text}</li>)}</ul>
        <h4 className={styles.kicker}>Como pensar</h4>{lesson.explanation.map((text) => <p key={text} style={{ marginTop: "var(--space-4)" }}>{text}</p>)}
      </div>
      <div className={styles.reviewAnswer}><h4 className={styles.kicker}>Exemplo resolvido</h4><p className={styles.passage} lang={lesson.skill.section === "rw" ? "en" : "pt-BR"}>{lesson.example.prompt}</p><ol className={styles.reviewList} style={{ listStyle: "decimal", paddingLeft: "var(--space-6)" }}>{lesson.example.steps.map((step) => <li key={step}>{step}</li>)}</ol><p className={styles.note}><strong>Resposta:</strong> <span lang={lesson.skill.section === "rw" ? "en" : "pt-BR"}>{lesson.example.answer}</span></p></div>
      <div><h4 className={styles.kicker}>Armadilhas frequentes</h4><ul className={styles.reviewList}>{lesson.pitfalls.map((text) => <li key={text}>{text}</li>)}</ul></div>
      {!progressUnavailable && <form className={styles.form} onSubmit={submit}>
        <div className={`${styles.field} ${styles.full}`}><label htmlFor={`notes-${lesson.id}`}>Minhas notas</label><textarea id={`notes-${lesson.id}`} maxLength={4000} value={draft.notes} onChange={(event) => edit({ notes: event.target.value })} disabled={pending} placeholder="Explique a ideia com suas palavras ou anote uma dúvida." /></div>
        <label className={styles.full} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minHeight: "var(--target-min)", fontSize: "var(--type-meta)" }}><input type="checkbox" checked={draft.completed} onChange={(event) => edit({ completed: event.target.checked })} disabled={pending} />Concluí a leitura e revisei o exemplo</label>
        <div className={`${styles.full} ${styles.actions}`}><Button type="submit" disabled={pending || !dirty || (!onSaveProgress && !developmentData)}>{pending ? "Salvando…" : developmentData && !onSaveProgress ? "Aplicar nesta página" : "Salvar notas e progresso"}</Button>{dirty && !pending && <span className={styles.muted}>Alterações ainda não salvas.</span>}</div>
        {feedback && <p className={`${styles.full} ${styles.feedback} ${error ? styles.error : ""}`} role={error ? "alert" : "status"}>{feedback}</p>}
      </form>}
    </details>
  </article>;
}
