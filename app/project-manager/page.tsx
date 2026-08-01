"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { bootstrapKernel } from "@/lib/kernel/bootstrap";
import { kernelEventBus } from "@/lib/kernel/event-bus";
import { kernelPlanner, type ExecutionPlan } from "@/lib/kernel/planner-engine";
import { kernelRunner, type PlanRun } from "@/lib/kernel/runner-engine";
import type { QueueTask } from "@/lib/kernel/queue-engine";
import "./project-manager.css";

type QueueState = "queued" | "running" | "completed" | "failed" | "cancelled";

type DisplayTask = QueueTask & { state: QueueState };

function detectProject(goal: string) {
  const value = goal.toLowerCase();
  if (value.includes("inner")) return "INNER";
  if (value.includes("lutoway")) return "LUTOWAY OS";
  if (value.includes("soloclimb")) return "SoloClimb";
  return "Новый проект";
}

export default function ProjectManagerPage() {
  const [brief, setBrief] = useState("Сделать новый hero для INNER: премиальный визуал, сильный оффер, плавная смена товара и идеальная мобильная версия.");
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [activeRun, setActiveRun] = useState<PlanRun | null>(null);
  const [runs, setRuns] = useState<PlanRun[]>([]);
  const [tasks, setTasks] = useState<DisplayTask[]>([]);
  const [error, setError] = useState("");

  const isRunning = activeRun?.status === "running";
  const completedCount = tasks.filter((task) => task.state === "completed").length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  useEffect(() => {
    bootstrapKernel();
    setRuns(kernelRunner.list());

    const refresh = () => {
      const snapshot = kernelRunner.snapshot();
      setTasks([
        ...snapshot.running.map((task) => ({ ...task, state: "running" as const })),
        ...snapshot.queued.map((task) => ({ ...task, state: "queued" as const })),
        ...snapshot.completed.map((task) => ({ ...task, state: "completed" as const })),
        ...snapshot.failed.map((task) => ({ ...task, state: "failed" as const })),
        ...snapshot.cancelled.map((task) => ({ ...task, state: "cancelled" as const })),
      ].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      setRuns(kernelRunner.list());
    };

    const unsubscribe = kernelEventBus.subscribe("*", refresh);
    const interval = window.setInterval(refresh, 250);
    refresh();

    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!activeRun) return;
    const current = kernelRunner.get(activeRun.id);
    if (current && current.status !== activeRun.status) setActiveRun({ ...current });
  }, [tasks, activeRun]);

  const visibleTasks = useMemo(() => {
    if (!activeRun) return [];
    return tasks.filter((task) => activeRun.taskIds.includes(task.id));
  }, [activeRun, tasks]);

  const startRun = () => {
    if (!brief.trim() || isRunning) return;
    setError("");

    try {
      bootstrapKernel();
      const projectId = detectProject(brief);
      const nextPlan = kernelPlanner.createPlan(brief, { projectId });
      const validation = kernelPlanner.validate(nextPlan);
      if (!validation.valid) throw new Error(validation.errors.join("; "));

      const run = kernelRunner.run(nextPlan);
      setPlan(nextPlan);
      setActiveRun({ ...run });
      setRuns(kernelRunner.list());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось запустить AI-команду");
    }
  };

  const cancelRun = () => {
    if (!activeRun) return;
    kernelRunner.cancel(activeRun.id);
    const current = kernelRunner.get(activeRun.id);
    if (current) setActiveRun({ ...current });
  };

  return (
    <main className="pm-shell">
      <aside className="pm-sidebar">
        <div className="pm-brand">LUTOWAY OS <span>/ kernel</span></div>
        <nav>
          <Link href="/">Brain</Link>
          <Link href="/departments">Departments</Link>
          <Link className="active" href="/project-manager">Project Manager</Link>
        </nav>
        <div className="pm-sidebar-meta">
          <span>KERNEL STATUS</span>
          <b><i /> {isRunning ? "RUNNING" : "READY"}</b>
          <small>{plan?.steps.length ?? 0} tasks in current plan</small>
        </div>
      </aside>

      <section className="pm-workspace">
        <header className="pm-header">
          <div>
            <div className="pm-kicker">AI OPERATING SYSTEM</div>
            <h1>Project Manager</h1>
            <p>Planner строит план, Runner передаёт шаги в Queue, Agent Runtime выполняет их, а Memory сохраняет результат.</p>
          </div>
          <div className="pm-status"><span /> KERNEL ONLINE</div>
        </header>

        <section className="pm-grid">
          <div className="pm-card pm-brief-card">
            <div className="pm-card-head"><span>01</span><h2>Цель</h2></div>
            <textarea value={brief} onChange={(event) => setBrief(event.target.value)} rows={6} />
            <div className="pm-actions">
              <span>{brief.trim().length} символов</span>
              {isRunning ? (
                <button type="button" onClick={cancelRun}>Остановить запуск</button>
              ) : (
                <button type="button" onClick={startRun} disabled={!brief.trim()}>Построить и выполнить план</button>
              )}
            </div>
            {error && <p className="pm-error">{error}</p>}
          </div>

          <div className="pm-card">
            <div className="pm-card-head"><span>02</span><h2>Execution Plan</h2></div>
            {!plan ? <div className="pm-empty">План появится после запуска.</div> : (
              <div className="pm-agent-list">
                {plan.steps.map((step, index) => (
                  <button key={step.id} type="button" className="selected">
                    <i />
                    <span><b>{String(index + 1).padStart(2, "0")} · {step.title}</b><small>{step.agentId} · {step.skillIds.length} skills · {step.toolIds.length} tools</small></span>
                    <em>{step.dependsOn.length ? "CHAIN" : "START"}</em>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="pm-card pm-live-card">
          <div className="pm-card-head"><span>03</span><h2>Live Queue · {progress}%</h2></div>
          {!visibleTasks.length ? <div className="pm-empty">Очередь свободна.</div> : (
            <div className="pm-queue">
              {visibleTasks.map((task, index) => (
                <article key={task.id} className={task.state === "running" ? "active" : task.state === "completed" ? "done" : task.state}>
                  <div className="pm-step-index">{String(index + 1).padStart(2, "0")}</div>
                  <div>
                    <h3>{task.title}</h3>
                    <p>{String((task.input as { objective?: string }).objective ?? task.type)}</p>
                    <small>{task.agentId} · priority {task.priority} · attempt {task.attempts ?? 0}</small>
                  </div>
                  <b>{task.state.toUpperCase()}</b>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="pm-card pm-history-card">
          <div className="pm-card-head"><span>04</span><h2>Kernel Runs</h2></div>
          {!runs.length ? <div className="pm-empty">История пока пуста.</div> : (
            <div className="pm-history">
              {runs.map((run) => (
                <details key={run.id}>
                  <summary>
                    <span><b>{run.projectId ?? "Project"}</b><small>{new Date(run.createdAt).toLocaleString("ru-RU")}</small></span>
                    <em>{run.status} · {run.taskIds.length} tasks</em>
                  </summary>
                  <div className="pm-history-body">
                    <p>Plan: {run.planId}</p>
                    <ul>{run.taskIds.map((taskId) => <li key={taskId}>{taskId}</li>)}</ul>
                    {run.error && <small>{run.error}</small>}
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
