import { kernelMemory, type KernelMemoryEngine } from "@/lib/kernel/memory-engine";
import { kernelSkills, type KernelSkillEngine } from "@/lib/kernel/skill-engine";
import { kernelTools, type KernelToolHub } from "@/lib/kernel/tool-hub";
import type { KernelExecutionContext, KernelTask, TaskExecutor } from "@/lib/kernel/types";

export type AgentDefinition = {
  id: string;
  name: string;
  description: string;
  taskTypes: string[];
  defaultSkillIds?: string[];
  allowedToolIds?: string[];
  execute: (input: AgentExecutionInput, context: AgentExecutionContext) => Promise<AgentExecutionResult>;
};

export type AgentExecutionInput = {
  objective: string;
  expectedOutput?: string;
  skillIds?: string[];
  toolIds?: string[];
  contextKeys?: string[];
  planId?: string;
  stepId?: string;
};

export type AgentExecutionResult = {
  summary: string;
  artifacts?: Array<{ type: string; title: string; value: unknown }>;
  memory?: Array<{ key: string; value: unknown; tags?: string[] }>;
  toolCalls?: Array<{ toolId: string; capability: string; input: unknown }>;
  metadata?: Record<string, unknown>;
};

export type AgentExecutionContext = {
  task: KernelTask<AgentExecutionInput, AgentExecutionResult>;
  projectId?: string;
  memories: Array<{ key: string; value: unknown }>;
  skillIds: string[];
  toolIds: string[];
  useTool: <TOutput = unknown>(toolId: string, capability: string, input: unknown) => Promise<TOutput>;
  writeMemory: (key: string, value: unknown, tags?: string[]) => void;
};

export class AgentRuntime {
  private agents = new Map<string, AgentDefinition>();

  constructor(
    private readonly memory: KernelMemoryEngine = kernelMemory,
    private readonly skills: KernelSkillEngine = kernelSkills,
    private readonly tools: KernelToolHub = kernelTools,
  ) {}

  register(agent: AgentDefinition) {
    if (!agent.id.trim()) throw new Error("Agent id is required");
    if (!agent.taskTypes.length) throw new Error(`Agent ${agent.id} has no task types`);
    this.agents.set(agent.id, agent);
    this.memory.write({
      kind: "agent",
      key: `agent:${agent.id}`,
      value: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        taskTypes: agent.taskTypes,
        defaultSkillIds: agent.defaultSkillIds ?? [],
        allowedToolIds: agent.allowedToolIds ?? [],
      },
      tags: ["agent", agent.id],
    });
    return agent;
  }

  get(agentId: string) {
    return this.agents.get(agentId);
  }

  list() {
    return [...this.agents.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  createExecutor(agentId: string): TaskExecutor<AgentExecutionInput, AgentExecutionResult> {
    return async (task, kernelContext) => this.execute(agentId, task, kernelContext);
  }

  createExecutorForTaskType(taskType: string): TaskExecutor<AgentExecutionInput, AgentExecutionResult> {
    return async (task, kernelContext) => {
      const agent = this.list().find((candidate) => candidate.taskTypes.includes(taskType));
      if (!agent) throw new Error(`No agent registered for task type: ${taskType}`);
      return this.execute(agent.id, task, kernelContext);
    };
  }

  private async execute(
    agentId: string,
    task: KernelTask<AgentExecutionInput, AgentExecutionResult>,
    kernelContext: KernelExecutionContext,
  ) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Unknown agent: ${agentId}`);
    if (!agent.taskTypes.includes(task.type)) throw new Error(`Agent ${agentId} cannot execute task type ${task.type}`);

    const requestedSkillIds = [...new Set([...(agent.defaultSkillIds ?? []), ...(task.input.skillIds ?? [])])];
    const knownSkillIds = requestedSkillIds.filter((skillId) => Boolean(this.skills.get(skillId)));
    const requestedToolIds = [...new Set(task.input.toolIds ?? [])];
    const allowedToolIds = agent.allowedToolIds ?? [];
    const toolIds = requestedToolIds.filter((toolId) => allowedToolIds.includes(toolId) && Boolean(this.tools.get(toolId)));
    const memories = (task.input.contextKeys ?? [])
      .map((key) => this.memory.read(key, task.projectId))
      .filter((memory): memory is NonNullable<typeof memory> => Boolean(memory))
      .map((memory) => ({ key: memory.key, value: memory.value }));

    const runtimeContext: AgentExecutionContext = {
      task,
      projectId: task.projectId,
      memories,
      skillIds: knownSkillIds,
      toolIds,
      useTool: async <TOutput>(toolId: string, capability: string, input: unknown) => {
        if (!toolIds.includes(toolId)) throw new Error(`Tool ${toolId} is not allowed for agent ${agentId}`);
        return this.tools.execute(toolId, capability, input) as Promise<TOutput>;
      },
      writeMemory: (key, value, tags = []) => {
        kernelContext.writeMemory({
          kind: "artifact",
          key,
          value,
          projectId: task.projectId,
          tags: [agentId, task.type, ...tags],
        });
      },
    };

    const result = await agent.execute(task.input, runtimeContext);
    result.memory?.forEach((item) => runtimeContext.writeMemory(item.key, item.value, item.tags));
    result.artifacts?.forEach((artifact, index) => {
      runtimeContext.writeMemory(
        `artifact:${task.id}:${index + 1}`,
        artifact,
        [artifact.type, "agent-output"],
      );
    });

    return result;
  }
}

export const agentRuntime = new AgentRuntime();
