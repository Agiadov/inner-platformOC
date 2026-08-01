"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildCrewRun, type CrewRunPlan } from "@/lib/crew-orchestrator";
import { loadCrewRuns, saveCrewRun } from "@/lib/crew-storage";
import "./project-manager.css";

type Agent = {
  id: string;
  name: string;
  department: string;
  output: string;
  color: string;
};

const agents: Agent[] = [
  { id: "pm", name: "Project Manager", department: "Operations", output: "Единый план, приоритеты и зависимости", color: "#f4c66a" },
  { id: "uiux", name: "UI/UX Agent", department: "Design", output: "UX-концепция и карта экранов", color: "#e56ca8" },
  { id: "motion", name: "Motion Agent", department: "Design", output: "Motion-spec и готовые анимации", color: "#b879ff" },
  { id: "frontend", name: "Frontend Agent", department: "Developers", output: "Рабочий интерфейс и список изменённых файлов", color: "#ff8a5b" },
  { id: "qa", name: "QA Agent", department: "Developers", output: "Отчёт с приоритетами и шагами исправления", color: "#58b9ff" },
  { id: "copy", name: "Landing Copy", department: "Marketing", output: "Готовый текст лендинга", color: "#ff6666" },
  { id: "strategy", name: "Content Strategy", department: "Social", output: "Контент-система на месяц", color: "#5f7cff" },
  { id: "finance", name: "Unit Economics", department: "Finance", output: "Юнит-экономика и точки риска", color: "#45c7a0" },
];

const defaultTeam = ["pm", "uiux", "motion", "frontend", "qa"];

export default function ProjectManagerPage() {
  const [brief, setBrief] = useState("Сделать новый hero для INNER: премиальный визуал, сильный оффер, плавная смена товара и идеальная мобильная версия.");
  const [selected, setSelected] = useState(defaultTeam);
  const [runs, setRuns] = useState<CrewRunPlan[]>([]);
  const [activeRun, setActiveRun] = useState<CrewRunPlan | null>(null);
  const [activeStep, setActiveStep] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedAgents = useMemo(() => agents.filter((agent) => selected.includes(agent.id)), [selected]);

  useEffect(() => {
    loadCrewRuns().then(setRuns).catch(() => setRuns([]));
  }, []);

  const toggleAgent = (id: string) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const startRun = async () => {
    if (!brief.trim() || !selectedAgents.length || activeRun) return;
    setError("");
    const run = buildCrewRun(brief, selectedAgents);
    setActiveRun(run);
    setActiveStep(0);

    for (let index = 0; index < run.steps.length; index += 1) {
      setActiveStep(index);
      await new Promise((resolve) => window.setTimeout(resolve, 650));
    }

    setActiveStep(run.steps.length);
    setSaving(true);
    try {
      await saveCrewRun(run);
      setRuns((current) => [run, ...current.filter((item) => item.id !== run.id)].slice(0, 30));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить запуск");
    } finally {
      setSaving(false);
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      setActiveRun(null);
      setActiveStep(-1);
    }
  };

  return (
    <main className="pm-shell">
      <aside className="pm-sidebar">
        <div className="pm-brand">LUTOWAY OS <span>/ project manager</span></div>
        <nav>
          <Link href="/">Brain</Link>
          <Link href="/departments">Departments</Link>
          <Link className="active" href="/project-manager">Project Manager</Link>
        </nav>
        <div className="pm-sidebar-meta">
          <span>CREW STATUS</span>
          <b><i /> {activeRun ? "RUNNING" : "READY"}</b>
          <small>{selectedAgents.length} agents selected</small>
        </div>
      </aside>

      <section className="pm-workspace">
        <header className="pm-header">
          <div>
            <div className="pm-kicker">ORCHESTRATION CENTER</div>
            <h1>Project Manager</h1>
            <p>Разбивает задачу на этапы, запускает агентов по очереди и сохраняет результат в историю проекта.</p>
          </div>
          <div className="pm-status"><span /> SYSTEM ONLINE</div>
        </header>

        <section className="pm-grid">
          <div className="pm-card pm-brief-card">
            <div className="pm-card-head"><span>01</span><h2>Задача</h2></div>
            <textarea value={brief} onChange={(event) => setBrief(event.target.value)} rows={6} />
            <div className="pm-actions">
              <span>{brief.trim().length} символов</span>
              <button type="button" onClick={startRun} disabled={!brief.trim() || !selectedAgents.length || Boolean(activeRun)}>
                {activeRun ? "Команда работает" : "Запустить Project Manager"}
              </button>
            </div>
            {error && <p className="pm-error">{error}</p>}
          </div>

          <div className="pm-card">
            <div className="pm-card-head"><span>02</span><h2>Команда</h2></div>
            <div className="pm-agent-list">
              {agents.map((agent) => {
                const isSelected = selected.includes(agent.id);
                return (
                  <button key={agent.id} type="button" className={isSelected ? "selected" : ""} onClick={() => toggleAgent(agent.id)}>
                    <i style={{ background: agent.color }} />
                    <span><b>{agent.name}</b><small>{agent.department}</small></span>
                    <em>{isSelected ? "ON" : "OFF"}</em>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="pm-card pm-live-card">
          <div className="pm-card-head"><span>03</span><h2>Live Queue</h2></div>
          {!activeRun ? (
            <div className="pm-empty">Очередь свободна. Опиши задачу и запусти команду.</div>
          ) : (
            <div className="pm-queue">
              {activeRun.steps.map((step, index) => {
                const state = index < activeStep ? "done" : index === activeStep ? "active" : "queued";
                return (
                  <article key={step.id} className={state}>
                    <div className="pm-step-index">{String(index + 1).padStart(2, "0")}</div>
                    <div><h3>{step.agentName}</h3><p>{step.objective}</p><small>{step.deliverable}</small></div>
                    <b>{state === "done" ? "DONE" : state === "active" ? "WORKING" : "QUEUED"}</b>
                  </article>
                );
              })}
              <article className={activeStep >= activeRun.steps.length ? "active" : "queued"}>
                <div className="pm-step-index">AI</div>
                <div><h3>Project Manager synthesis</h3><p>Собирает результаты агентов в единый план выполнения.</p><small>{saving ? "Сохраняет запуск в историю" : "Готовит финальный пакет"}</small></div>
                <b>{activeStep >= activeRun.steps.length ? "SAVING" : "QUEUED"}</b>
              </article>
            </div>
          )}
        </section>

        <section className="pm-card pm-history-card">
          <div className="pm-card-head"><span>04</span><h2>История запусков</h2></div>
          {!runs.length ? <div className="pm-empty">История пока пуста.</div> : (
            <div className="pm-history">
              {runs.map((run) => (
                <details key={run.id}>
                  <summary>
                    <span><b>{run.project}</b><small>{new Date(run.createdAt).toLocaleString("ru-RU")}</small></span>
                    <em>{run.steps.length} agents</em>
                  </summary>
                  <div className="pm-history-body">
                    <p>{run.brief}</p>
                    <ul>{run.steps.map((step) => <li key={step.id}><b>{step.agentName}</b> — {step.deliverable}</li>)}</ul>
                    {run.synthesis.map((line) => <small key={line}>{line}</small>)}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
