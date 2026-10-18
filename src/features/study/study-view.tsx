"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Play, RotateCcw } from "lucide-react";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { formatCivilDate } from "@/lib/format-date";
import { DOMAIN_LABELS, SECTION_LABELS } from "@/lib/sat/taxonomy";
import type { SatSection, SaveResult, Skill, StudyPlanItem } from "@/types/domain";
import styles from "@/features/workspace/workspace.module.css";

const STATUS_LABELS: Record<StudyPlanItem["status"], string> = {
  planned: "Planejada", in_progress: "Em andamento", completed: "Concluída",
};
const DIFFICULTY_LABELS = { low: "Baixa", medium: "Média", high: "Alta" } as const;

function resourceHref(value: string): string | null {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch { return null; }
}

export function StudyView({ initialItems, skills, referenceDate, userId, onSave, developmentData = true }: {
  initialItems: readonly StudyPlanItem[];
  skills: readonly Skill[];
  referenceDate: string;
  userId: string;
  onSave?: (item: StudyPlanItem) => Promise<SaveResult<StudyPlanItem>>;
  developmentData?: boolean;
}) {
  const [items, setItems] = useState<readonly StudyPlanItem[]>(initialItems);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<SatSection | "all">("all");
  const [status, setStatus] = useState<StudyPlanItem["status"] | "all">("all");
  const [feedback, setFeedback] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [saveError, setSaveError] = useState("");
  const statusSelect = useRef<HTMLSelectElement>(null);
  const createSection = useRef<HTMLDetailsElement>(null);
  const createId = useRef<string | null>(null);
  const skillsById = new Map(skills.map(skill => [skill.id, skill]));
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  function matchesFilters(item: StudyPlanItem) {
    const skill = skillsById.get(item.skillId);
    const text = [item.title, item.notes, skill?.name, skill ? DOMAIN_LABELS[skill.domain] : ""].join(" ").toLocaleLowerCase("pt-BR");
    return (section === "all" || skill?.section === section) && (status === "all" || item.status === status) && text.includes(normalizedQuery);
  }
  const visibleItems = items.filter(matchesFilters).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const agendaDates = [...new Set(visibleItems.map(item => item.date))];
  const hasFilters = Boolean(query || section !== "all" || status !== "all");

  function clearFilters() { setQuery(""); setSection("all"); setStatus("all"); }

  async function persist(item: StudyPlanItem): Promise<StudyPlanItem | null> {
    if (!onSave) return item;
    if (saveLock.current) return null;
    saveLock.current = true; setSaving(true); setSaveError("");
    try {
      const result = await onSave(item);
      if (!result.ok) { setSaveError(result.error); return null; }
      return result.value;
    } catch { setSaveError("Não foi possível salvar. Os campos foram preservados para tentar novamente."); return null; }
    finally { saveLock.current = false; setSaving(false); }
  }

  async function updateStatus(item: StudyPlanItem, nextStatus: StudyPlanItem["status"]) {
    const saved = await persist({ ...item, status: nextStatus });
    if (!saved) return;
    if (status !== "all" && status !== nextStatus) statusSelect.current?.focus();
    else requestAnimationFrame(() => document.getElementById(`study-action-${item.id}`)?.focus());
    setItems(current => current.map(currentItem => currentItem.id === item.id ? saved : currentItem));
    setFeedback(`“${item.title}”: ${STATUS_LABELS[nextStatus].toLocaleLowerCase("pt-BR")}${onSave ? ". Alteração salva na sua conta." : " apenas nesta página."}`);
  }

  async function updateDetails(event: FormEvent<HTMLFormElement>, item: StudyPlanItem) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const durationMinutes = Number(values.get("duration"));
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1) return;
    const difficulty = String(values.get("personalDifficulty"));
    const personalDifficulty = difficulty === "low" || difficulty === "medium" || difficulty === "high" ? difficulty : null;
    const notes = String(values.get("notes") ?? "").trim();
    const updated: StudyPlanItem = { ...item, durationMinutes, personalDifficulty, notes };
    const saved = await persist(updated);
    if (!saved) return;
    if (!matchesFilters(updated)) document.getElementById("study-search")?.focus();
    setItems(current => current.map(currentItem => currentItem.id === item.id ? saved : currentItem));
    setFeedback(`Duração, dificuldade pessoal e notas de “${item.title}” ${onSave ? "salvas na sua conta." : "atualizadas apenas nesta página."}`);
  }

  async function addActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const title = String(values.get("title") ?? "").trim();
    const skillId = String(values.get("skillId") ?? "");
    const durationMinutes = Number(values.get("duration"));
    const date = String(values.get("date") ?? "");
    const time = String(values.get("time") ?? "");
    const resourceUrl = String(values.get("resourceUrl") ?? "").trim();
    const difficulty = String(values.get("personalDifficulty"));
    const personalDifficulty = difficulty === "low" || difficulty === "medium" || difficulty === "high" ? difficulty : null;
    if (!title || !skillsById.has(skillId) || !date || !time || !Number.isInteger(durationMinutes) || durationMinutes < 1) {
      setFormError("Preencha título, habilidade, data, hora e uma duração em minutos inteiros maior que zero.");
      return;
    }
    let resource: StudyPlanItem["resource"] = null;
    if (resourceUrl) {
      try {
        const url = new URL(resourceUrl);
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol");
        resource = { label: "Abrir recurso de estudo", href: url.href };
      } catch {
        setFormError("Use um endereço de recurso que comece com https:// ou http://.");
        form.querySelector<HTMLInputElement>("[name=resourceUrl]")?.focus();
        return;
      }
    }
    const id = createId.current ??= crypto.randomUUID();
    const saved = await persist({
      id, userId, skillId, title, date, time, durationMinutes,
      status: "planned", personalDifficulty, notes: String(values.get("notes") ?? "").trim(), resource,
    });
    if (!saved) return;
    createId.current = null;
    setItems(current => [...current.filter(item => item.id !== saved.id), saved]);
    setFormError("");
    setFeedback(`“${title}” ${onSave ? "salva na sua conta." : "adicionada apenas nesta página."}${hasFilters ? " Os filtros atuais podem ocultar a nova atividade." : ""}`);
    form.reset();
    form.querySelector<HTMLInputElement>("[name=title]")?.focus();
  }

  return <>
    <PageIntro developmentData={developmentData} eyebrow="Estudos / Uma rotina possível" title="Seu estudo, com intenção." description="Organize atividades, registre sua percepção e encontre tempo para o que precisa de atenção.">
      <Button onClick={() => { if (createSection.current) createSection.current.open = true; requestAnimationFrame(() => document.getElementById("new-study-title")?.focus()); }}>Planejar atividade</Button>
    </PageIntro>
    <div className={styles.note}>{onSave ? "Atividades, duração e notas são gravadas na sua conta após confirmação. Sua agenda também aparece na visão geral." : <>Este plano local não atualiza o dashboard. A data de referência dos exemplos é {formatCivilDate(referenceDate)}; a agenda abaixo usa as datas das atividades.</>}</div>
    {saveError && <p role="alert" className={styles.error}>{saveError}</p>}
    {saving && <p role="status">Salvando alteração…</p>}
    <fieldset disabled={saving} style={{ border: 0, minWidth: 0, padding: 0 }}>

    <div className={styles.toolbar} aria-label="Filtros de atividades">
      <div className={`${styles.field} ${styles.search}`}><label htmlFor="study-search">Buscar atividades</label><input id="study-search" type="search" placeholder="Título, habilidade ou anotação" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <div className={`${styles.field} ${styles.filter}`}><label htmlFor="study-section">Seção</label><select id="study-section" value={section} onChange={event => setSection(event.target.value as SatSection | "all")}><option value="all">Todas as seções</option><option value="rw">Reading and Writing</option><option value="math">Math</option></select></div>
      <div className={`${styles.field} ${styles.filter}`}><label htmlFor="study-status">Status</label><select ref={statusSelect} id="study-status" value={status} onChange={event => setStatus(event.target.value as StudyPlanItem["status"] | "all")}><option value="all">Todos os status</option><option value="planned">Planejada</option><option value="in_progress">Em andamento</option><option value="completed">Concluída</option></select></div>
      {hasFilters && <Button variant="ghost" onClick={clearFilters}>Limpar filtros</Button>}
    </div>
    <p className={styles.count} role="status">{visibleItems.length} de {items.length} {items.length === 1 ? "atividade" : "atividades"}</p>
    <p className={styles.feedback} role="status" aria-atomic="true">{feedback}</p>

    {visibleItems.length ? <>
      <div className={styles.sectionHeading}><h2>Atividades do seu plano</h2><span className={styles.muted}>{onSave ? "Seu plano pessoal." : "Todas as alterações são locais."}</span></div>
      <div className={styles.grid}>{visibleItems.map(item => {
        const skill = skillsById.get(item.skillId);
        const href = item.resource ? resourceHref(item.resource.href) : null;
        const statusClass = item.status === "completed" ? styles.success : item.status === "in_progress" ? styles.active : "";
        return <article className={styles.panel} key={item.id} aria-labelledby={`study-title-${item.id}`}>
          <div className={styles.row}><span className={styles.kicker}>{skill ? SECTION_LABELS[skill.section] : "Habilidade indisponível"}</span><span className={`${styles.status} ${statusClass}`}>{STATUS_LABELS[item.status]}</span></div>
          <h3 id={`study-title-${item.id}`}>{item.title}</h3>
          <p className={styles.muted}>{skill ? `${skill.name} · ${DOMAIN_LABELS[skill.domain]}` : "A habilidade desta atividade não está na lista disponível."}</p>
          <div className={styles.meta}><span><time dateTime={item.date}>{formatCivilDate(item.date)}</time> · {item.time}</span><span>{item.durationMinutes} min</span></div>
          <p className={styles.muted}>Dificuldade pessoal: {item.personalDifficulty ? DIFFICULTY_LABELS[item.personalDifficulty] : "não registrada"}</p>
          {item.notes && <p className={styles.note}>{item.notes}</p>}
          {item.resource && (href ? <div className={styles.actions}><Button asChild variant="outline">{href.startsWith("/") ? <Link href={href}>{item.resource.label} <ArrowUpRight size={16} aria-hidden="true" /></Link> : <a href={href} target="_blank" rel="noopener noreferrer">{item.resource.label} <ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only"> (abre em nova aba)</span></a>}</Button></div> : <p className={styles.note}>O endereço deste recurso não está disponível.</p>)}
          <div className={styles.actions}>
            {item.status === "planned" && <Button id={`study-action-${item.id}`} onClick={() => updateStatus(item, "in_progress")} aria-label={`Iniciar ${item.title}`}><Play size={16} aria-hidden="true" /> Iniciar atividade</Button>}
            {item.status !== "completed" ? <Button id={item.status === "in_progress" ? `study-action-${item.id}` : undefined} variant={item.status === "in_progress" ? "default" : "outline"} onClick={() => updateStatus(item, "completed")} aria-label={`Concluir ${item.title}`}><Check size={16} aria-hidden="true" /> Concluir atividade</Button> : <Button id={`study-action-${item.id}`} variant="outline" onClick={() => updateStatus(item, "planned")} aria-label={`Reabrir ${item.title}`}><RotateCcw size={16} aria-hidden="true" /> Reabrir atividade</Button>}
          </div>
          <details className={styles.details}><summary>Ajustar duração e notas<span className="sr-only"> de {item.title}</span></summary><form className={styles.form} onSubmit={event => updateDetails(event, item)} aria-label={`Ajustar ${item.title}`}>
            <div className={styles.field}><label htmlFor={`duration-${item.id}`}>Duração (min)</label><input id={`duration-${item.id}`} name="duration" type="number" min="1" step="1" required defaultValue={item.durationMinutes} /></div>
            <div className={styles.field}><label htmlFor={`difficulty-${item.id}`}>Dificuldade pessoal</label><select id={`difficulty-${item.id}`} name="personalDifficulty" defaultValue={item.personalDifficulty ?? ""}><option value="">Não registrada</option><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></div>
            <div className={`${styles.field} ${styles.full}`}><label htmlFor={`notes-${item.id}`}>Notas da atividade</label><textarea id={`notes-${item.id}`} name="notes" defaultValue={item.notes} /></div>
            <div className={styles.full}><Button type="submit" variant="secondary">{onSave ? "Salvar alterações" : "Aplicar nesta página"}</Button></div>
          </form></details>
        </article>;
      })}</div>

      <section aria-labelledby="study-agenda-heading"><div className={styles.sectionHeading}><h2 id="study-agenda-heading">Agenda das atividades</h2><span className={styles.muted}>Acompanha os filtros acima.</span></div><div className={styles.timeline}>{agendaDates.map(date => <div key={date} className={styles.timelineDay}><h3><time dateTime={date}>{formatCivilDate(date)}</time></h3><ul>{visibleItems.filter(item => item.date === date).map(item => <li key={item.id}><span className={styles.muted}>{item.time} · {item.durationMinutes} min</span><strong>{item.title}</strong><span className={`${styles.status} ${item.status === "completed" ? styles.success : item.status === "in_progress" ? styles.active : ""}`}>{STATUS_LABELS[item.status]}</span></li>)}</ul></div>)}</div></section>
    </> : <div className={styles.empty}><h2>{hasFilters ? "Nenhuma atividade com esses filtros." : "Sua rotina pode começar pequena."}</h2><p>{hasFilters ? "Tente outra busca ou limpe os filtros para ver seu plano." : "Adicione uma atividade abaixo e reserve um momento para estudar."}</p>{hasFilters && <Button variant="outline" onClick={clearFilters}>Limpar filtros</Button>}</div>}

    <details ref={createSection} className={styles.disclosure}><summary>Adicionar atividade</summary><p className={styles.muted}>Um compromisso simples, ligado a uma habilidade. {onSave ? "Ele será vinculado à sua conta." : "Ele existe apenas nesta página."}</p><form className={styles.form} onSubmit={addActivity} aria-label="Nova atividade" aria-describedby={formError ? "study-form-error" : undefined}>
      <div className={`${styles.field} ${styles.full}`}><label htmlFor="new-study-title">Título da atividade</label><input id="new-study-title" name="title" required maxLength={160} placeholder="Ex.: Revisar inferências em textos curtos" /></div>
      <div className={styles.field}><label htmlFor="new-study-skill">Habilidade</label><select id="new-study-skill" name="skillId" required defaultValue=""><option value="" disabled>Selecione uma habilidade</option>{skills.map(skill => <option key={skill.id} value={skill.id}>{SECTION_LABELS[skill.section]} · {skill.name}</option>)}</select></div>
      <div className={styles.field}><label htmlFor="new-study-difficulty">Dificuldade pessoal</label><select id="new-study-difficulty" name="personalDifficulty" defaultValue=""><option value="">Não registrada</option><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></div>
      <div className={styles.field}><label htmlFor="new-study-date">Data</label><input id="new-study-date" name="date" type="date" defaultValue={referenceDate} required /></div>
      <div className={styles.field}><label htmlFor="new-study-time">Hora</label><input id="new-study-time" name="time" type="time" defaultValue="09:00" required /></div>
      <div className={styles.field}><label htmlFor="new-study-duration">Duração (min)</label><input id="new-study-duration" name="duration" type="number" min="1" step="1" defaultValue={25} required /></div>
      <div className={styles.field}><label htmlFor="new-study-resource">Recurso de estudo (URL opcional)</label><input id="new-study-resource" name="resourceUrl" type="url" placeholder="https://" aria-describedby="study-resource-hint" /><span id="study-resource-hint" className={styles.muted}>Somente endereços http:// ou https://.</span></div>
      <div className={`${styles.field} ${styles.full}`}><label htmlFor="new-study-notes">Notas (opcional)</label><textarea id="new-study-notes" name="notes" placeholder="O que você quer praticar nesta atividade?" /></div>
      {formError && <p className={`${styles.error} ${styles.full}`} id="study-form-error" role="alert">{formError}</p>}
      <div className={`${styles.actions} ${styles.full}`}><Button type="submit" disabled={!skills.length}>{onSave ? "Salvar atividade" : "Adicionar nesta página"}</Button><p className={styles.muted}>{skills.length ? onSave ? "Aguarde a confirmação de salvamento antes de sair." : "Ao sair ou recarregar, esta atividade será descartada." : "É necessário ter ao menos uma habilidade disponível para criar uma atividade."}</p></div>
    </form></details>
    </fieldset>
  </>;
}
