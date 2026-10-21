"use client";

import { memo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import type { ExamAnnotation, ExamBlock, ExamResult } from "@/types/domain";
import styles from "./exam.module.css";

export const ExamBlocks = memo(function ExamBlocks({ blocks, annotations = [] }: { blocks: readonly ExamBlock[]; annotations?: readonly ExamAnnotation[] }) {
  return <div className={styles.blocks}>{blocks.map((block) => {
    if (block.type === "math") return <div key={block.id} className={styles.formula} dangerouslySetInnerHTML={{ __html: katex.renderToString(block.latex, { throwOnError: false, trust: false, output: "htmlAndMathml", displayMode: true, maxExpand: 1000 }) }} />;
    if (block.type === "image") return <figure key={block.id} className={styles.figure}>{/* Private signed images must not pass through a public image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={block.src} alt={block.alt} loading="lazy" /><figcaption>{block.alt}</figcaption></figure>;
    if (block.type === "table") return <div className={styles.tableScroll} key={block.id} tabIndex={0} role="region" aria-label="Question data table"><table><thead><tr>{block.headers.map((header, index) => <th key={index} scope="col">{header}</th>)}</tr></thead><tbody>{block.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
    const ranges = annotations.filter((annotation) => annotation.blockId === block.id);
    const cuts = [...new Set([0, block.text.length, ...ranges.flatMap(({ start, end }) => [Math.max(0, Math.min(start, block.text.length)), Math.max(0, Math.min(end, block.text.length))])])].sort((a, b) => a - b);
    return <p key={block.id} data-exam-block={block.id}>{cuts.slice(0, -1).map((start, index) => {
      const end = cuts[index + 1];
      const selected = ranges.filter((range) => range.start <= start && range.end >= end);
      return <span key={start} className={[selected.some((range) => range.style === "highlight") ? styles.highlight : "", selected.some((range) => range.style === "underline") ? styles.underline : ""].join(" ")}>{block.text.slice(start, end)}</span>;
    })}</p>;
  })}</div>;
});

export function ExamReference() {
  const entries = [
    ["Circle", "A=\\pi r^2,\\quad C=2\\pi r"], ["Rectangle", "A=lw"], ["Triangle", "A=\\frac12 bh"],
    ["Right triangle", "a^2+b^2=c^2"], ["30°–60°–90° triangle", "x,\\ x\\sqrt{3},\\ 2x"], ["45°–45°–90° triangle", "x,\\ x,\\ x\\sqrt{2}"],
    ["Rectangular prism", "V=lwh"], ["Cylinder", "V=\\pi r^2h"], ["Sphere", "V=\\frac43\\pi r^3"], ["Cone", "V=\\frac13\\pi r^2h"], ["Pyramid", "V=\\frac13 lwh"],
  ];
  return <div className={styles.reference}><p>A circle has 360 degrees or 2π radians. The angles of a triangle add up to 180 degrees.</p><dl>{entries.map(([name, latex]) => <div key={name}><dt>{name}</dt><dd><ExamBlocks blocks={[{ id: name, type: "math", latex }]} /></dd></div>)}</dl><p>For special right triangles, lengths are listed from shortest side to hypotenuse.</p></div>;
}

const domainNames: Record<string, string> = {
  "information-and-ideas": "Information and Ideas", "craft-and-structure": "Craft and Structure", "expression-of-ideas": "Expression of Ideas", "standard-english-conventions": "Standard English Conventions", algebra: "Algebra", "advanced-math": "Advanced Math", "problem-solving-and-data-analysis": "Problem-Solving and Data Analysis", "geometry-and-trigonometry": "Geometry and Trigonometry",
};

export function ExamResults({ result }: { result: ExamResult }) {
  const groups = new Map<string, { correct: number; total: number }>();
  const skills = new Map<string, { correct: number; total: number }>();
  for (const item of result.items) if (item.scored) {
    const group = groups.get(item.question.domain) ?? { correct: 0, total: 0 };
    group.total++; if (item.correct) group.correct++;
    groups.set(item.question.domain, group);
    const skill = skills.get(item.question.skillId) ?? { correct: 0, total: 0 };
    skill.total++; if (item.correct) skill.correct++;
    skills.set(item.question.skillId, skill);
  }
  return <section className={styles.result} lang="pt-BR"><p className={styles.eyebrow}>SIMULADO CONCLUÍDO · EXPERIMENTAL</p><h1>Uma leitura do seu desempenho.</h1><p>Este resultado não equivale a uma nota oficial do SAT. A dificuldade e a adaptação são editoriais.</p>
    <dl className={styles.metrics}><div><dt>Acertos pontuados</dt><dd>{result.correct}<small> / {result.total}</small></dd></div><div><dt>Aproveitamento</dt><dd>{result.total ? Math.round(result.correct / result.total * 100) : 0}%</dd></div><div><dt>Em branco</dt><dd>{result.blank}</dd></div><div><dt>Tempo observado</dt><dd>{Math.round(result.observedMs / 60000)}<small> min</small></dd></div></dl>
    <p className={styles.muted}>Tempo observado conta apenas a atividade registrada nesta interface; não representa a duração total da prova.</p>
    <h2>Por seção e domínio</h2><div className={styles.sectionResults}>{result.sections.map((section) => <article key={section.section}><h3>{section.section === "rw" ? "Reading and Writing" : "Math"}</h3><p>{section.correct} de {section.total} acertos · segundo módulo de {section.route === "higher" ? "maior" : "menor"} dificuldade</p></article>)}</div>
    <div className={styles.tableScroll}><table><thead><tr><th scope="col">Domínio</th><th scope="col">Acertos</th><th scope="col">Aproveitamento</th></tr></thead><tbody>{[...groups].map(([domain, group]) => <tr key={domain}><th scope="row">{domainNames[domain] ?? domain}</th><td>{group.correct} / {group.total}</td><td>{Math.round(group.correct / group.total * 100)}%</td></tr>)}</tbody></table></div>
    <h2>Por habilidade</h2><div className={styles.tableScroll}><table><thead><tr><th scope="col">Habilidade</th><th scope="col">Acertos / amostra</th></tr></thead><tbody>{[...skills].map(([skill, group]) => <tr key={skill}><th scope="row">{skill}</th><td>{group.correct} / {group.total}</td></tr>)}</tbody></table></div>
    <h2>Revisão das {result.items.length} questões</h2><p>Itens não pontuados aparecem apenas na revisão e não contam para o aproveitamento.</p>
    <div className={styles.reviewList}>{result.items.map((item, index) => <details key={`${item.phase}-${item.question.id}`}><summary><span>{index + 1}. {item.question.section === "rw" ? "Reading and Writing" : "Math"} · módulo {item.phase.endsWith("1") ? "1" : "2"}</span><strong>{item.answer.value === null ? "Em branco" : item.correct ? "Correta" : "Incorreta"}{!item.scored ? " · Não pontuada" : ""}</strong></summary><div className={styles.reviewBody}><div lang="en"><ExamBlocks blocks={item.question.passage} /><ExamBlocks blocks={item.question.content} />{item.question.options.map((option) => <div key={option.id} className={styles.reviewOption}><strong>{option.label}.</strong><ExamBlocks blocks={option.content} /></div>)}</div><p><strong>Sua resposta:</strong> {item.question.options.find((option) => option.id === item.answer.value)?.label ?? item.answer.value ?? "Em branco"}</p><p><strong>Resposta correta:</strong> {item.correctAnswer}</p><p className={styles.explanation}>{item.explanation}</p><p className={styles.muted}>Habilidade: {item.question.skillId} · Fonte: {item.question.provenance.label}</p></div></details>)}</div>
    <a className={styles.primary} href="/erros">Abrir diário de erros</a><a className={styles.button} href="/simulador">Voltar aos simulados</a>
  </section>;
}
