import type { KernelEvent, KernelEventType } from "@/lib/kernel/types";

type KernelEventListener<TPayload = unknown> = (event: KernelEvent<TPayload>) => void;
type Unsubscribe = () => void;

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export class KernelEventBus {
  private listeners = new Map<KernelEventType | "*", Set<KernelEventListener>>();
  private history: KernelEvent[] = [];

  constructor(private readonly historyLimit = 300) {}

  emit<TPayload>(event: Omit<KernelEvent<TPayload>, "id" | "timestamp">): KernelEvent<TPayload> {
    const nextEvent: KernelEvent<TPayload> = {
      ...event,
      id: createId("event"),
      timestamp: new Date().toISOString(),
    };

    this.history = [nextEvent, ...this.history].slice(0, this.historyLimit);
    this.notify(event.type, nextEvent);
    this.notify("*", nextEvent);

    return nextEvent;
  }

  subscribe<TPayload>(type: KernelEventType | "*", listener: KernelEventListener<TPayload>): Unsubscribe {
    const listeners = this.listeners.get(type) ?? new Set<KernelEventListener>();
    listeners.add(listener as KernelEventListener);
    this.listeners.set(type, listeners);

    return () => {
      const current = this.listeners.get(type);
      current?.delete(listener as KernelEventListener);
      if (current?.size === 0) this.listeners.delete(type);
    };
  }

  once<TPayload>(type: KernelEventType, listener: KernelEventListener<TPayload>): Unsubscribe {
    const unsubscribe = this.subscribe<TPayload>(type, (event) => {
      unsubscribe();
      listener(event);
    });

    return unsubscribe;
  }

  getHistory(filter?: { type?: KernelEventType; taskId?: string; projectId?: string; limit?: number }) {
    const limit = filter?.limit ?? this.historyLimit;

    return this.history
      .filter((event) => !filter?.type || event.type === filter.type)
      .filter((event) => !filter?.taskId || event.taskId === filter.taskId)
      .filter((event) => !filter?.projectId || event.projectId === filter.projectId)
      .slice(0, limit);
  }

  clearHistory() {
    this.history = [];
  }

  clearListeners() {
    this.listeners.clear();
  }
}

export const kernelEventBus = new KernelEventBus();
