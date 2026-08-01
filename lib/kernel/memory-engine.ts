import { kernelEventBus, type KernelEventBus } from "@/lib/kernel/event-bus";
import type { KernelMemory, KernelMemoryKind } from "@/lib/kernel/types";

type MemoryQuery = {
  projectId?: string;
  kind?: KernelMemoryKind;
  tags?: string[];
  search?: string;
  limit?: number;
};

function memoryId() {
  return `memory-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export class KernelMemoryEngine {
  private entries = new Map<string, KernelMemory>();
  private keyIndex = new Map<string, string>();

  constructor(private readonly events: KernelEventBus = kernelEventBus) {}

  write<TValue>(input: Omit<KernelMemory<TValue>, "id" | "createdAt" | "updatedAt">) {
    const now = new Date().toISOString();
    const indexKey = this.indexKey(input.key, input.projectId);
    const existingId = this.keyIndex.get(indexKey);
    const existing = existingId ? this.entries.get(existingId) : undefined;

    const memory: KernelMemory<TValue> = {
      ...input,
      id: existing?.id ?? memoryId(),
      tags: [...new Set(input.tags.map(normalize).filter(Boolean))],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.entries.set(memory.id, memory as KernelMemory);
    this.keyIndex.set(indexKey, memory.id);
    this.events.emit({
      type: "memory.written",
      projectId: memory.projectId,
      payload: memory,
    });

    return memory;
  }

  read<TValue>(key: string, projectId?: string) {
    const id = this.keyIndex.get(this.indexKey(key, projectId));
    return (id ? this.entries.get(id) : undefined) as KernelMemory<TValue> | undefined;
  }

  get<TValue>(id: string) {
    return this.entries.get(id) as KernelMemory<TValue> | undefined;
  }

  remove(id: string) {
    const memory = this.entries.get(id);
    if (!memory) return false;

    this.entries.delete(id);
    this.keyIndex.delete(this.indexKey(memory.key, memory.projectId));
    this.events.emit({
      type: "memory.deleted",
      projectId: memory.projectId,
      payload: memory,
    });
    return true;
  }

  query(input: MemoryQuery = {}) {
    const search = normalize(input.search ?? "");
    const requiredTags = (input.tags ?? []).map(normalize).filter(Boolean);
    const limit = Math.max(1, input.limit ?? 100);

    return [...this.entries.values()]
      .filter((memory) => !input.projectId || memory.projectId === input.projectId)
      .filter((memory) => !input.kind || memory.kind === input.kind)
      .filter((memory) => requiredTags.every((tag) => memory.tags.includes(tag)))
      .filter((memory) => {
        if (!search) return true;
        const haystack = `${memory.key} ${memory.kind} ${memory.tags.join(" ")} ${JSON.stringify(memory.value)}`.toLowerCase();
        return haystack.includes(search);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }

  export() {
    return [...this.entries.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  hydrate(entries: KernelMemory[]) {
    this.entries.clear();
    this.keyIndex.clear();

    entries.forEach((memory) => {
      this.entries.set(memory.id, memory);
      this.keyIndex.set(this.indexKey(memory.key, memory.projectId), memory.id);
    });
  }

  clear(projectId?: string) {
    if (!projectId) {
      this.entries.clear();
      this.keyIndex.clear();
      return;
    }

    this.query({ projectId, limit: Number.MAX_SAFE_INTEGER }).forEach((memory) => {
      this.entries.delete(memory.id);
      this.keyIndex.delete(this.indexKey(memory.key, memory.projectId));
    });
  }

  private indexKey(key: string, projectId?: string) {
    return `${projectId ?? "global"}:${normalize(key)}`;
  }
}

export const kernelMemory = new KernelMemoryEngine();
