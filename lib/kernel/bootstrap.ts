import { agentRuntime, type AgentDefinition } from "@/lib/kernel/agent-runtime";
import { supabaseTool } from "@/lib/kernel/adapters/supabase-tool";
import { kernelRunner } from "@/lib/kernel/runner-engine";
import { kernelSkills, type SkillDefinition } from "@/lib/kernel/skill-engine";
import { kernelTools } from "@/lib/kernel/tool-hub";

let bootstrapped = false;

const skills: SkillDefinition[] = [
  { id: "research", name: "Research", description: "Собирает контекст, ограничения и референсы.", category: "strategy", tags: ["research", "context"], capabilities: ["analysis", "brief"], version: "1.0.0", enabled: true },
  { id: "ui-ux", name: "UI/UX", description: "Проектирует структуру и пользовательский путь.", category: "design", tags: ["ui", "ux", "layout"], capabilities: ["wireframe", "hierarchy", "accessibility"], version: "1.0.0", enabled: true },
  { id: "copywriting", name: "Copywriting", description: "Пишет оффер, заголовки и CTA.", category: "marketing", tags: ["copy", "offer", "cta"], capabilities: ["headline", "landing-copy"], version: "1.0.0", enabled: true },
  { id: "motion", name: "Motion Design", description: "Проектирует переходы и микроанимации.", category: "design", tags: ["motion", "animation"], capabilities: ["framer-motion", "transitions"], version: "1.0.0", enabled: true },
  { id: "frontend", name: "Frontend", description: "Собирает адаптивные React/Next.js интерфейсы.", category: "development", tags: ["react", "next", "typescript"], capabilities: ["implementation", "responsive-ui"], tools: ["supabase"], version: "1.0.0", enabled: true },
  { id: "qa", name: "Quality Assurance", description: "Проверяет сборку и пользовательские сценарии.", category: "development", tags: ["qa", "testing"], capabilities: ["regression", "mobile-check"], version: "1.0.0", enabled: true },
  { id: "content-strategy", name: "Content Strategy", description: "Строит рубрики и контент-план.", category: "social", tags: ["content", "reels", "shorts"], capabilities: ["content-plan", "formats"], version: "1.0.0", enabled: true },
];

function createAgent(input: Omit<AgentDefinition, "execute">): AgentDefinition {
  return {
    ...input,
    execute: async (taskInput, context) => {
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      const summary = `${input.name}: выполнена задача «${taskInput.objective}».`;
      return {
        summary,
        artifacts: [{
          type: "agent-result",
          title: taskInput.expectedOutput ?? input.name,
          value: {
            summary,
            skills: context.skillIds,
            tools: context.toolIds,
            contextKeys: context.memories.map((memory) => memory.key),
          },
        }],
      };
    },
  };
}

const agents: AgentDefinition[] = [
  createAgent({ id: "research", name: "Research Agent", description: "Собирает контекст проекта.", taskTypes: ["agent.research"], defaultSkillIds: ["research"] }),
  createAgent({ id: "uiux", name: "UI/UX Agent", description: "Проектирует структуру интерфейса.", taskTypes: ["agent.design"], defaultSkillIds: ["ui-ux"] }),
  createAgent({ id: "copy", name: "Copy Agent", description: "Готовит тексты и оффер.", taskTypes: ["agent.copy"], defaultSkillIds: ["copywriting"] }),
  createAgent({ id: "reels", name: "Reels Agent", description: "Пишет сценарии коротких видео.", taskTypes: ["agent.copy"], defaultSkillIds: ["copywriting", "content-strategy"] }),
  createAgent({ id: "strategy", name: "Strategy Agent", description: "Строит контент-систему.", taskTypes: ["agent.strategy"], defaultSkillIds: ["content-strategy"] }),
  createAgent({ id: "motion", name: "Motion Agent", description: "Проектирует анимации.", taskTypes: ["agent.motion"], defaultSkillIds: ["motion"] }),
  createAgent({ id: "frontend", name: "Frontend Agent", description: "Собирает интерфейс.", taskTypes: ["agent.frontend"], defaultSkillIds: ["frontend"], allowedToolIds: ["supabase"] }),
  createAgent({ id: "qa", name: "QA Agent", description: "Проверяет результат.", taskTypes: ["agent.qa"], defaultSkillIds: ["qa"] }),
];

export function bootstrapKernel() {
  if (bootstrapped) return;
  bootstrapped = true;

  if (!kernelTools.get(supabaseTool.id)) kernelTools.register(supabaseTool);

  skills.forEach((skill) => {
    if (!kernelSkills.get(skill.id)) kernelSkills.register(skill);
  });

  agents.forEach((agent) => {
    if (!agentRuntime.get(agent.id)) agentRuntime.register(agent);
  });

  const taskTypes = [...new Set(agents.flatMap((agent) => agent.taskTypes))];
  taskTypes.forEach((taskType) => {
    kernelRunner.registerExecutor(taskType, agentRuntime.createExecutorForTaskType(taskType));
  });
}
