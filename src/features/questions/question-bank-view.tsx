"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageIntro } from "@/components/page-intro";
import { DOMAIN_LABELS, SECTION_LABELS } from "@/lib/sat/taxonomy";
import { PracticeCard, type PracticeActions } from "./practice-card";
import type { Question, SatSection, Skill } from "@/types/domain";
import styles from "@/features/workspace/workspace.module.css";

const DIFFICULTY_LABELS: Record<Question["difficulty"], string> = { easy: "Fácil", medium: "Média", hard: "Difícil" };

export function QuestionBankView({ questions, skills, developmentData = true, onSubmitAnswer, onSaveReflection }: { questions: readonly Question[]; skills: readonly Skill[]; developmentData?: boolean } & PracticeActions) {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<SatSection | "all">("all");
  const [difficulty, setDifficulty] = useState<Question["difficulty"] | "all">("all");
  const skillsById = new Map(skills.map(skill => [skill.id, skill]));
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const visibleQuestions = questions.filter(question => {
    const skill = skillsById.get(question.skillId);
    const text = [question.prompt, question.passage, skill?.name, skill ? DOMAIN_LABELS[skill.domain] : "", ...question.options.map(option => option.text)].join(" ").toLocaleLowerCase("pt-BR");
    return (section === "all" || question.section === section) && (difficulty === "all" || question.difficulty === difficulty) && text.includes(normalizedQuery);
  });
  const hasFilters = Boolean(query || section !== "all" || difficulty !== "all");

  function clearFilters() { setQuery(""); setSection("all"); setDifficulty("all"); }

  return <>
    <PageIntro developmentData={developmentData} eyebrow="Banco de questões / Explore o raciocínio" title="Questões para pensar melhor." description={developmentData ? "Explore os textos, as habilidades e as alternativas de questões originais de desenvolvimento." : "Pratique com questões originais e use a explicação para compreender o raciocínio."}>
      <Button asChild><Link href="/simulador/treino">Abrir sessão curta <ArrowRight size={16} aria-hidden="true" /></Link></Button>
    </PageIntro>
    <div className={styles.note}>{onSubmitAnswer ? "Na prática individual, a correção aparece após a confirmação do envio. Uma resposta incorreta permite registrar interpretação, conteúdo ou falta de atenção como causa do erro. A sessão curta é independente dos filtros deste banco." : "Este banco permite consultar enunciados e alternativas. A autoavaliação é temporária, sem correção real. A sessão curta é independente dos filtros: ela usa as cinco questões fixas do simulador, sem treino personalizado."}</div>
    <div className={styles.toolbar} aria-label="Filtros do banco de questões">
      <div className={`${styles.field} ${styles.search}`}><label htmlFor="questions-search">Buscar questões</label><input id="questions-search" type="search" placeholder="Texto, alternativa ou habilidade" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <div className={`${styles.field} ${styles.filter}`}><label htmlFor="questions-section">Seção</label><select id="questions-section" value={section} onChange={event => setSection(event.target.value as SatSection | "all")}><option value="all">Todas as seções</option><option value="rw">Reading and Writing</option><option value="math">Math</option></select></div>
      <div className={`${styles.field} ${styles.filter}`}><label htmlFor="questions-difficulty">Dificuldade da questão</label><select id="questions-difficulty" value={difficulty} onChange={event => setDifficulty(event.target.value as Question["difficulty"] | "all")}><option value="all">Todas as dificuldades</option><option value="easy">Fácil</option><option value="medium">Média</option><option value="hard">Difícil</option></select></div>
      {hasFilters && <Button variant="ghost" onClick={clearFilters}>Limpar filtros</Button>}
    </div>
    <p className={styles.count} role="status">{visibleQuestions.length} de {questions.length} {questions.length === 1 ? "questão" : "questões"}</p>
    <div className={styles.grid}>{questions.map(question => {
      const skill = skillsById.get(question.skillId);
      const number = questions.indexOf(question) + 1;
      return <article key={`${question.id}-${question.version}`} hidden={!visibleQuestions.includes(question)} className={styles.panel} aria-labelledby={`bank-question-${question.id}-${question.version}`}>
        <div className={styles.row}><span className={styles.kicker}>{SECTION_LABELS[question.section]}</span><span className={styles.muted}>Questão {String(number).padStart(2, "0")} · v{question.version}</span></div>
        <h2 id={`bank-question-${question.id}-${question.version}`}>{skill?.name ?? "Habilidade indisponível"}</h2>
        {skill && <p className={styles.muted}>{DOMAIN_LABELS[skill.domain]}</p>}
        <div className={styles.meta}><span>Dificuldade: {DIFFICULTY_LABELS[question.difficulty]}</span><span>Múltipla escolha</span></div>
        <p className={styles.passage} lang={question.language}>{question.prompt}</p>
        <details className={styles.details}><summary>{onSubmitAnswer ? "Consultar texto de apoio" : "Consultar texto e alternativas"}<span className="sr-only"> da questão {number}</span></summary>
          <div lang={question.language}>{question.passage && <p className={styles.passage}>{question.passage}</p>}{!onSubmitAnswer && <ol className={styles.options} aria-label="Alternativas da questão">{question.options.map(option => <li key={option.id} value={option.label.length === 1 ? option.label.charCodeAt(0) - 64 : undefined}>{option.text}</li>)}</ol>}</div>
          <p className={styles.muted}>{question.provenance.kind === "original-development" ? "Conteúdo original de desenvolvimento" : "Conteúdo original"} · {question.provenance.author}. Sem gabarito nesta consulta.</p>
        </details>
        <PracticeCard question={question} onSubmitAnswer={onSubmitAnswer} onSaveReflection={onSaveReflection} />
      </article>;
    })}</div>
    {!visibleQuestions.length && <div className={styles.empty}><h2>{section === "math" && !questions.some(question => question.section === "math") ? "Ainda não há questões de Math." : hasFilters ? "Nenhuma questão com esses filtros." : "O banco ainda não tem questões."}</h2><p>{section === "math" && !questions.some(question => question.section === "math") ? "O conjunto disponível contém questões de Reading and Writing." : hasFilters ? "Tente outra busca ou limpe os filtros para explorar o conjunto disponível." : "Novas questões aparecerão aqui quando houver conteúdo disponível."}</p>{hasFilters && <Button variant="outline" onClick={clearFilters}>Limpar filtros</Button>}</div>}
  </>;
}
