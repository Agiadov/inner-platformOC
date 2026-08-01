export type KernelTaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type KernelTask<TInput = unknown, TOutput = unknown> = {
  id: string;
  type: string;
  title: string;
  projectId?: string;
  agentId?: string;
  input: TInput;
  output?: TOutput;
  status: KernelTaskStatus;
  priority: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, unknown>;
};

export type KernelEventType =
  | "task.created"
  | "task.started"
  | "task.completed"
  | "task.failed"
  | "task.cancelled"
  | "memory.written"
  | "memory.deleted"
  | "tool.registered"
  | "tool.started"
  | "tool.completed"
  | "tool.failed"
  | "run.started"
  | "run.completed";

export type KernelEvent<TPayload = unknown> = {
  id: string;
  type: KernelEventType;
  timestamp: string;
  taskId?: string;
  projectId?: string;
  payload: TPayload;
};

export type KernelMemoryKind = "project" | "note" | "run" | "artifact" | "agent" | "skill" | "tool" | "system";

export type KernelMemory<TValue = unknown> = {
  id: string;
  kind: KernelMemoryKind;
  key: string;
  value: TValue;
  projectId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type TaskExecutor<TInput = unknown, TOutput = unknown> = (
  task: KernelTask<TInput, TOutput>,
  context: KernelExecutionContext,
) => Promise<TOutput>;

export type KernelExecutionContext = {
  emit: <TPayload>(event: Omit<KernelEvent<TPayload>, "id" | "timestamp">) => KernelEvent<TPayload>;
  readMemory: <TValue>(key: string, projectId?: string) => KernelMemory<TValue> | undefined;
  writeMemory: <TValue>(memory: Omit<KernelMemory<TValue>, "id" | "createdAt" | "updatedAt">) => KernelMemory<TValue>;
};
