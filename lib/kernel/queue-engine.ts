import { kernelEventBus, type KernelEventBus } from "@/lib/kernel/event-bus";
import type { KernelExecutionContext, KernelTask, TaskExecutor } from "@/lib/kernel/types";

export type QueueTask<TInput = unknown, TOutput = unknown> = KernelTask<TInput, TOutput> & {
  dependsOn?: string[];
  attempts?: number;
  maxAttempts?: number;
};

type QueueSnapshot = {
  queued: QueueTask[];
  running: QueueTask[];
  completed: QueueTask[];
  failed: QueueTask[];
  cancelled: QueueTask[];
};

function taskId() {
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export class KernelQueue {
  private tasks = new Map<string, QueueTask>();
  private executors = new Map<string, TaskExecutor>();
  private processing = false;
  private paused = false;

  constructor(
    private readonly context: KernelExecutionContext,
    private readonly events: KernelEventBus = kernelEventBus,
  ) {}

  registerExecutor<TInput, TOutput>(type: string, executor: TaskExecutor<TInput, TOutput>) {
    this.executors.set(type, executor as TaskExecutor);
    return () => this.executors.delete(type);
  }

  enqueue<TInput>(input: {
    type: string;
    title: string;
    input: TInput;
    projectId?: string;
    agentId?: string;
    priority?: number;
    dependsOn?: string[];
    maxAttempts?: number;
    metadata?: Record<string, unknown>;
  }): QueueTask<TInput> {
    const task: QueueTask<TInput> = {
      id: taskId(),
      type: input.type,
      title: input.title,
      input: input.input,
      projectId: input.projectId,
      agentId: input.agentId,
      priority: input.priority ?? 0,
      dependsOn: input.dependsOn ?? [],
      maxAttempts: Math.max(1, input.maxAttempts ?? 1),
      attempts: 0,
      metadata: input.metadata,
      status: "queued",
      createdAt: new Date().toISOString(),
    };

    this.tasks.set(task.id, task);
    this.events.emit({ type: "task.created", taskId: task.id, projectId: task.projectId, payload: task });
    void this.process();
    return task;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    void this.process();
  }

  cancel(taskIdValue: string) {
    const task = this.tasks.get(taskIdValue);
    if (!task || task.status === "completed" || task.status === "cancelled") return false;
    task.status = "cancelled";
    task.completedAt = new Date().toISOString();
    this.events.emit({ type: "task.cancelled", taskId: task.id, projectId: task.projectId, payload: task });
    return true;
  }

  retry(taskIdValue: string) {
    const task = this.tasks.get(taskIdValue);
    if (!task || task.status !== "failed") return false;
    task.status = "queued";
    task.error = undefined;
    task.completedAt = undefined;
    void this.process();
    return true;
  }

  reprioritize(taskIdValue: string, priority: number) {
    const task = this.tasks.get(taskIdValue);
    if (!task || task.status !== "queued") return false;
    task.priority = priority;
    void this.process();
    return true;
  }

  get(taskIdValue: string) {
    return this.tasks.get(taskIdValue);
  }

  snapshot(): QueueSnapshot {
    const all = [...this.tasks.values()];
    return {
      queued: all.filter((task) => task.status === "queued"),
      running: all.filter((task) => task.status === "running"),
      completed: all.filter((task) => task.status === "completed"),
      failed: all.filter((task) => task.status === "failed"),
      cancelled: all.filter((task) => task.status === "cancelled"),
    };
  }

  private dependenciesCompleted(task: QueueTask) {
    return (task.dependsOn ?? []).every((dependencyId) => this.tasks.get(dependencyId)?.status === "completed");
  }

  private nextTask() {
    return [...this.tasks.values()]
      .filter((task) => task.status === "queued" && this.dependenciesCompleted(task))
      .sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt))[0];
  }

  private async process() {
    if (this.processing || this.paused) return;
    this.processing = true;

    try {
      while (!this.paused) {
        const task = this.nextTask();
        if (!task) break;
        const executor = this.executors.get(task.type);
        if (!executor) {
          task.status = "failed";
          task.error = `Executor not registered for task type: ${task.type}`;
          task.completedAt = new Date().toISOString();
          this.events.emit({ type: "task.failed", taskId: task.id, projectId: task.projectId, payload: task });
          continue;
        }

        task.status = "running";
        task.startedAt = new Date().toISOString();
        task.attempts = (task.attempts ?? 0) + 1;
        this.events.emit({ type: "task.started", taskId: task.id, projectId: task.projectId, payload: task });

        try {
          const output = await executor(task, this.context);
          const currentTask = this.tasks.get(task.id);
          if (!currentTask || currentTask.status === "cancelled") continue;

          currentTask.output = output;
          currentTask.status = "completed";
          currentTask.completedAt = new Date().toISOString();
          this.events.emit({
            type: "task.completed",
            taskId: currentTask.id,
            projectId: currentTask.projectId,
            payload: currentTask,
          });
        } catch (error) {
          const currentTask = this.tasks.get(task.id) ?? task;
          if (currentTask.status === "cancelled") continue;

          currentTask.error = error instanceof Error ? error.message : String(error);
          if ((currentTask.attempts ?? 0) < (currentTask.maxAttempts ?? 1)) {
            currentTask.status = "queued";
            continue;
          }
          currentTask.status = "failed";
          currentTask.completedAt = new Date().toISOString();
          this.events.emit({
            type: "task.failed",
            taskId: currentTask.id,
            projectId: currentTask.projectId,
            payload: currentTask,
          });
        }
      }
    } finally {
      this.processing = false;
    }
  }
}
