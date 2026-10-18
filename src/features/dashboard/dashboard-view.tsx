import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Check, Clock3, Flag, FlaskConical, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssessmentResult, DashboardData } from "@/types/domain";

function ResultRow({ result }: { result: AssessmentResult }) {
  const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${result.date}T12:00:00Z`));
  const experimental = result.origin === "experimental";
  const origin = result.origin === "official_self_reported" ? "Nota oficial · autodeclarada" : result.origin === "printed_estimate" ? "Estimativa · material impresso" : "Sessão experimental";
  return (
    <li className="history-row">
      <span className="history-icon" aria-hidden="true">{experimental ? <FlaskConical size={18} /> : <BookOpen size={18} />}</span>
      <div className="history-info"><h3>{result.title}</h3><p>{origin}</p>{result.origin === "printed_estimate" && <p className="history-method">{result.material} · {result.conversionMethod}</p>}</div>
      <div className="history-outcome"><strong>{experimental ? `${result.correct}/${result.total}` : result.readingWriting + result.math}<span>{experimental ? " acertos" : " pontos"}</span></strong><time dateTime={result.date}>{date}</time></div>
    </li>
  );
}

export function DashboardView({ data, developmentData = false }: { data: DashboardData; developmentData?: boolean }) {
  const totalAnswers = data.performance.reduce((sum, row) => sum + row.total, 0);
  const totalCorrect = data.performance.reduce((sum, row) => sum + row.correct, 0);
  const accuracy = totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : null;
  return (
    <div className="dashboard">
      <header className="page-intro">
        <div><p className="eyebrow">Seu próximo capítulo</p><h1>Foco no que vem a seguir{data.studentName ? `, ${data.studentName}` : ""}.</h1><p className="page-description">Um passo de cada vez. Seu objetivo começa na prática de hoje.</p></div>
        <div className="intro-date"><span className="date-line" aria-hidden="true" /><p>{data.dateLabel}{developmentData && <span>Cenário de demonstração</span>}</p></div>
      </header>

      {developmentData && <div className="development-note"><FlaskConical size={16} aria-hidden="true" /><p><strong>Dados de desenvolvimento.</strong> Agenda, desempenho e histórico são exemplos. Suas respostas no simulador ficam apenas nesta sessão.</p></div>}

      <div className="dashboard-top-grid">
        <section className="next-activity" aria-labelledby="next-heading">
          <div className="activity-topline"><span className="eyebrow">01 / Próxima atividade</span><span className="activity-format"><span aria-hidden="true" /> Sessão curta</span></div>
          <div className="activity-body"><h2 id="next-heading">{data.nextActivity.title}</h2><p>{data.nextActivity.reason}</p></div>
          <div className="activity-bottom"><Button asChild size="lg"><Link href={data.nextActivity.href}>Começar a praticar <ArrowRight size={18} aria-hidden="true" /></Link></Button><span><Clock3 size={16} aria-hidden="true" /> Cerca de {data.nextActivity.minutes} min</span></div>
          <span className="activity-decoration" aria-hidden="true">Aa<span>→</span></span>
        </section>

        <section className="agenda-section" aria-labelledby="agenda-heading">
          <div className="section-topline"><h2 id="agenda-heading">No seu ritmo</h2><span className="eyebrow">{developmentData ? "Agenda exemplo" : "Sua agenda"}</span></div>
          {data.agenda.length ? <ol className="agenda-list">{data.agenda.map((item, index) => <li key={item.id}><div className="agenda-line"><span className={index === 0 ? "agenda-point current" : "agenda-point"} aria-hidden="true" />{index < data.agenda.length - 1 && <span className="agenda-stem" aria-hidden="true" />}</div><div><span className="agenda-time">{item.time}</span><h3>{item.title}</h3><p>{item.detail}</p></div></li>)}</ol> : <p className="empty-inline">Sua agenda ainda está livre. Comece com uma sessão curta no simulador.</p>}
          <p className="agenda-footnote">Consistência vale mais do que pressa.</p>
        </section>
      </div>

      <section className="performance-section" aria-labelledby="performance-heading">
        <div className="section-heading"><div><p className="eyebrow">02 / Conheça sua prática</p><h2 id="performance-heading">Cada resposta aponta um caminho.</h2></div><span className="subtle-meta">{developmentData ? "Amostra ilustrativa" : "Amostra de prática"} · {totalAnswers} questões</span></div>
        <div className="performance-grid">
          <div className="performance-summary"><span className="eyebrow">Acertos na amostra</span><p className="summary-number">{accuracy === null ? "—" : accuracy}<span>{accuracy === null ? "" : "%"}</span></p><p>{totalAnswers ? <><strong>{totalCorrect} de {totalAnswers} questões</strong> respondidas corretamente{developmentData ? " nos dados de exemplo" : ""}.</> : "Ainda não há respostas para analisar. Sua primeira sessão é um bom ponto de partida."}</p><div className="sample-note"><span aria-hidden="true" />Uma amostra de prática, sem equivalência à nota SAT.</div></div>
          <div className="skill-list">{data.performance.length ? data.performance.map(({ skill, correct, total }) => {
            const percentage = total ? Math.round(correct / total * 100) : null;
            return <div className="skill-row" key={skill.id}><div className="skill-head"><div><span className="skill-section">{skill.section === "rw" ? "Reading & Writing" : "Math"}</span><h3>{skill.name}</h3></div><strong>{percentage === null ? "—" : `${percentage}%`}</strong></div><div className="skill-meter" role={percentage === null ? undefined : "meter"} aria-hidden={percentage === null ? true : undefined} aria-label={`Acertos em ${skill.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage ?? undefined} aria-valuetext={total ? `${correct} acertos de ${total} questões` : "Sem questões respondidas"}><span style={{ width: `${percentage ?? 0}%` }} /></div><p>{total ? `${correct} acertos em ${total} questões` : "Sem questões respondidas"}</p></div>;
          }) : <div className="empty-inline"><BookOpen size={24} aria-hidden="true" /><h3>Seu ponto de partida está aqui.</h3><p>Pratique algumas questões para começar a conhecer suas habilidades.</p><Link className="text-link" href="/simulador">Abrir simulador <ArrowRight size={16} aria-hidden="true" /></Link></div>}</div>
        </div>
      </section>

      <div className="dashboard-bottom-grid">
        <section className="history-section" aria-labelledby="history-heading"><div className="section-topline"><div><p className="eyebrow">03 / Trajetória</p><h2 id="history-heading">O que já foi construído</h2></div><span className="subtle-meta">{developmentData ? "Histórico de exemplo" : "Histórico recente"}</span></div>{data.history.length ? <ul className="history-list">{data.history.map(result => <ResultRow key={result.id} result={result} />)}</ul> : <div className="empty-inline"><p>Seu histórico ainda não começou.</p><Link className="text-link" href="/simulador">Faça sua primeira sessão <ArrowRight size={16} aria-hidden="true" /></Link></div>}<p className="history-footnote">Resultados experimentais não representam uma nota oficial do SAT.</p></section>
        <aside className="goal-panel" aria-labelledby="goal-heading"><div className="goal-top"><Target size={21} aria-hidden="true" /><span className="eyebrow">Seu horizonte</span></div><h2 id="goal-heading">Uma meta para <br />guiar seus passos.</h2><p className="goal-number">{data.targetScore ?? "—"}<span>{data.targetScore ? "/ 1600" : "Meta não definida"}</span></p><p className="goal-description">{data.targetScore ? `${developmentData ? "Meta de estudo ilustrativa" : "Sua meta pessoal"}. Ela orienta a direção; a prática constrói o caminho.` : "Uma meta ajuda a dar direção à sua rotina. Por enquanto, comece pela prática."}</p><div className="goal-footer"><Flag size={16} aria-hidden="true" /><span>Meta pessoal · não é um resultado</span></div></aside>
      </div>
      <div className="dashboard-closing"><span className="closing-rule" /><Check size={15} aria-hidden="true" /><p>Uma sessão de cada vez já é progresso.</p><ArrowUpRight size={15} aria-hidden="true" /></div>
    </div>
  );
}
