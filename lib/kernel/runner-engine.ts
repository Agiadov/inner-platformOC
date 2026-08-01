import { kernelEventBus } from "@/lib/kernel/event-bus";
import { kernelMemory } from "@/lib/kernel/memory-engine";
import { KernelQueue } from "@/lib/kernel/queue-engine";
import type { ExecutionPlan, PlannerStep } from "@/lib/kernel/planner-engine";
import type { KernelExecutionContext, TaskExecutor } from "@/lib/kernel/types";

export type RunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type PlanRun = {
  id: string;
  planId: string;
  projectId?: string;
  status: RunStatus;
  taskIds: string[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
};

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const executionContext: KernelExecutionContext = {
  emit: (event) => kernelEventBus.emit(event),
  readMemory: (key, projectId) => kernelMemory.read(key, projectId),
  writeMemory: (memory) => kernelMemory.write(memory),
};

export class KernelRunner {
  private queue = new KernelQueue(executionContext);
  private runs = new Map<string, PlanRun>();

  registerExecutor<TInput, TOutput>(type: string, executor: TaskExecutor<TInput, TOutput>) {
    return this.queue.registerExecutor(type, executor);
  }

  run(plan: ExecutionPlan) {
    const run: PlanRun = {
      id: createId("run"),
      planId: plan.id,
      projectId: plan.projectId,
      status: "running",
      taskIds: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    this.runs.set(run.id, run);
    kernelEventBus.emit({ type: "run.started", projectId: run.projectId, payload: run });

    const taskIdByStep = new Map<string, string>();
    for (const step of plan.steps) {
      const task = this.enqueueStep(step, plan, taskIdByStep);
      taskIdByStep.set(step.id, task.id);
      run.taskIds.push(task.id);
    }

    this.watchRun(run.id);
    return run;
  }

  get(runId: string) {
    return this.runs.get(runId);
  }

  list() {
    return [...this.runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  cancel(runId: string) {
    const run = this.runs.get(runId);
    if (!run || ["completed", "failed", "cancelled"].includes(run.status)) return false;
    run.taskIds.forEach((taskId) => this.queue.cancel(taskId));
    run.status = "cancelled";
    run.completedAt = new Date().toISOString();
    kernelMemory.write({ kind: "run", key: `run:${run.id}`, value: run, projectId: run.projectId, tags: ["runner", "cancelled"] });
    return true;
  }

  snapshot() {
    return this.queue.snapshot();
  }

  private enqueueStep(step: PlannerStep, plan: ExecutionPlan, taskIdByStep: Map<string, string>) {
    return this.queue.enqueue({
      type: step.type,
      title: step.title,
      projectId: plan.projectId,
      agentId: step.agentId,
      priority: step.priority,
      dependsOn: step.dependsOn.map((stepId) => taskIdByStep.get(stepId)).filter((id): id is string => Boolean(id)),
      input: {
        objective: step.objective,
        expectedOutput: step.expectedOutput,
        skillIds: step.skillIds,
        toolIds: step.toolIds,
        contextKeys: plan.contextKeys,
        planId: plan.id,
        stepId: step.id,
      },
      metadata: {
        planId: plan.id,
        stepId: step.id,
      },
    });
  }

  private watchRun(runId: string) {
    const check = () => {
      const run = this.runs.get(runId);
      if (!run || run.status === "cancelled") return;

      const tasks = run.taskIds.map((taskId) => this.queue.get(taskId)).filter(Boolean);
      if (tasks.some((task) => task?.status === "failed")) {
        run.status = "failed";
        run.error = tasks.find((task) => task?.status === "failed")?.error;
        run.completedAt = new Date().toISOString();
        this.finishRun(run);
        return;
      }

      if (tasks.length === run.taskIds.length && tasks.every((task) => task?.status === "completed")) {
        run.status = "completed";
        run.completedAt = new Date().toISOString();
        this.finishRun(run);
        return;
      }

      window.setTimeout(check, 250);
    };

    if (typeof window !== "undefined") window.setTimeout(check, 250);
  }

  private finishRun(run: PlanRun) {
    kernelMemory.write({
      kind: "run",
      key: `run:${run.id}`,
      value: run,
      projectId: run.projectId,
      tags: ["runner", run.status],
    });
    kernelEventBus.emit({ type: "run.completed", projectId: run.projectId, payload: run });
  }
}

export const kernelRunner = new KernelRunner();
