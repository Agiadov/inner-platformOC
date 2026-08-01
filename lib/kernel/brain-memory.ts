import type { KnowledgeGraph, KnowledgeLink, KnowledgeNode, NodeKind } from "@/lib/graph-data";
import { kernelMemory, type KernelMemoryEngine } from "@/lib/kernel/memory-engine";
import type { KernelMemory, KernelMemoryKind } from "@/lib/kernel/types";

const graphKinds = new Set<NodeKind>(["project", "note", "skill", "tool", "file"]);

function toMemoryKind(kind: NodeKind): KernelMemoryKind {
  if (kind === "file") return "artifact";
  return kind;
}

function toNodeKind(kind: KernelMemoryKind): NodeKind | null {
  if (kind === "artifact") return "file";
  return graphKinds.has(kind as NodeKind) ? (kind as NodeKind) : null;
}

function defaultColor(kind: NodeKind) {
  return {
    project: "#55f2c0",
    note: "#f0b325",
    skill: "#9a7dff",
    tool: "#ff8d3b",
    file: "#7f9290",
  }[kind];
}

export class BrainMemoryBridge {
  constructor(private readonly memory: KernelMemoryEngine = kernelMemory) {}

  importGraph(graph: KnowledgeGraph) {
    graph.nodes.forEach((node) => this.writeNode(node));
    graph.links.forEach((link, index) => {
      this.memory.write({
        kind: "system",
        key: `graph-link:${link.source}:${link.target}:${index}`,
        value: link,
        tags: ["graph-link", link.relation],
      });
    });
  }

  writeNode(node: KnowledgeNode) {
    return this.memory.write({
      kind: toMemoryKind(node.kind),
      key: `graph-node:${node.id}`,
      value: node,
      projectId: node.group,
      tags: ["graph-node", node.kind, node.group],
    });
  }

  writeLink(link: KnowledgeLink) {
    return this.memory.write({
      kind: "system",
      key: `graph-link:${link.source}:${link.target}`,
      value: link,
      tags: ["graph-link", link.relation],
    });
  }

  removeNode(nodeId: string) {
    const memory = this.memory.read(`graph-node:${nodeId}`);
    if (memory) this.memory.remove(memory.id);
    this.memory.query({ tags: ["graph-link"], limit: Number.MAX_SAFE_INTEGER }).forEach((entry) => {
      const link = entry.value as KnowledgeLink;
      if (link.source === nodeId || link.target === nodeId) this.memory.remove(entry.id);
    });
  }

  removeLink(source: string, target: string) {
    this.memory.query({ tags: ["graph-link"], limit: Number.MAX_SAFE_INTEGER }).forEach((entry) => {
      const link = entry.value as KnowledgeLink;
      const sameDirection = link.source === source && link.target === target;
      const reverseDirection = link.source === target && link.target === source;
      if (sameDirection || reverseDirection) this.memory.remove(entry.id);
    });
  }

  exportGraph(): KnowledgeGraph {
    const nodes = this.memory
      .query({ tags: ["graph-node"], limit: Number.MAX_SAFE_INTEGER })
      .map((entry) => this.memoryToNode(entry))
      .filter((node): node is KnowledgeNode => Boolean(node));

    const links = this.memory
      .query({ tags: ["graph-link"], limit: Number.MAX_SAFE_INTEGER })
      .map((entry) => entry.value as KnowledgeLink)
      .filter((link) => nodes.some((node) => node.id === link.source) && nodes.some((node) => node.id === link.target));

    return { nodes, links };
  }

  private memoryToNode(entry: KernelMemory): KnowledgeNode | null {
    const stored = entry.value as Partial<KnowledgeNode>;
    if (stored.id && stored.name && stored.description && stored.kind && stored.group) {
      return {
        id: stored.id,
        name: stored.name,
        description: stored.description,
        kind: stored.kind,
        group: stored.group,
        color: stored.color ?? defaultColor(stored.kind),
        val: stored.val ?? (stored.kind === "project" ? 13 : 8),
      };
    }

    const kind = toNodeKind(entry.kind);
    if (!kind) return null;
    const id = entry.key.replace(/^graph-node:/, "");
    return {
      id,
      name: id,
      description: typeof entry.value === "string" ? entry.value : JSON.stringify(entry.value),
      kind,
      group: entry.projectId ?? "Система",
      color: defaultColor(kind),
      val: kind === "project" ? 13 : 8,
    };
  }
}

export const brainMemory = new BrainMemoryBridge();
