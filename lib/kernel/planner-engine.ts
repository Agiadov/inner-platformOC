import { kernelMemory, type KernelMemoryEngine } from "@/lib/kernel/memory-engine";
import { kernelSkills, type KernelSkillEngine, type SkillMatch } from "@/lib/kernel/skill-engine";
import { kernelTools, type KernelToolHub } from "@/lib/kernel/tool-hub";

export type PlannerStep = {
  id: string;
  title: string;
  type: string;
  agentId: string;
  objective: string;
  dependsOn: string[];
  priority: number;
  skillIds: string[];
  toolIds: string[];
  expectedOutput: string;
};

export type ExecutionPlan = {
  id: string;
  goal: string;
  projectId?: string;
  createdAt: string;
  steps: PlannerStep[];
  contextKeys: string[];
};

type PlanTemplate = {
  triggers: string[];
  steps: Array<Omit<PlannerStep, "id" | "dependsOn" | "skillIds" | "toolIds">>;
};

const templates: PlanTemplate[] = [
  {
    triggers: ["hero", "лендинг", "сайт", "интерфейс", "страниц"],
    steps: [
      { title: "Research", type: "agent.research", agentId: "research", objective: "Собрать контекст проекта, ограничения и лучшие референсы.", priority: 100, expectedOutput: "Краткий research brief" },
      { title: "UX direction", type: "agent.design", agentId: "uiux", objective: "Определить структуру, иерархию и пользовательский путь.", priority: 90, expectedOutput: "UX-концепция и структура экрана" },
      { title: "Copy", type: "agent.copy", agentId: "copy", objective: "Сформулировать оффер, заголовки и CTA.", priority: 85, expectedOutput: "Готовый текст интерфейса" },
      { title: "Motion", type: "agent.motion", agentId: "motion", objective: "Спроектировать переходы и микроанимации без перегруза.", priority: 80, expectedOutput: "Motion-spec" },
      { title: "Frontend", type: "agent.frontend", agentId: "frontend", objective: "Собрать адаптивный интерфейс и интегрировать дизайн.", priority: 70, expectedOutput: "Рабочая реализация" },
      { title: "QA", type: "agent.qa", agentId: "qa", objective: "Проверить сборку, мобильную версию и критические сценарии.", priority: 60, expectedOutput: "QA-отчёт и исправления" },
    ],
  },
  {
    triggers: ["контент", "reels", "рилс", "shorts", "телеграм"],
    steps: [
      { title: "Audience research", type: "agent.research", agentId: "research", objective: "Определить аудиторию, контекст и сильные темы.", priority: 100, expectedOutput: "Контент-бриф" },
      { title: "Content strategy", type: "agent.strategy", agentId: "strategy", objective: "Собрать рубрики, форматы и последовательность публикаций.", priority: 90, expectedOutput: "Контент-план" },
      { title: "Scripts", type: "agent.copy", agentId: "reels", objective: "Написать живые сценарии с хуком и удержанием.", priority: 80, expectedOutput: "Пакет сценариев" },
      { title: "Review", type: "agent.qa", agentId: "qa", objective: "Проверить ясность, естественность и соответствие задаче.", priority: 60, expectedOutput: "Отредактированный пакет" },
    ],
  },
];

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export class KernelPlanner {
  constructor(
    private readonly memory: KernelMemoryEngine = kernelMemory,
    private readonly skills: KernelSkillEngine = kernelSkills,
    private readonly tools: KernelToolHub = kernelTools,
  ) {}

  createPlan(goal: string, options?: { projectId?: string }): ExecutionPlan {
    const normalizedGoal = normalize(goal);
    if (!normalizedGoal) throw new Error("Planner goal cannot be empty");

    const template = templates.find((candidate) => candidate.triggers.some((trigger) => normalizedGoal.includes(trigger))) ?? templates[0];
    const availableToolIds = this.tools.list().map((tool) => tool.id);
    const context = this.memory.query({ projectId: options?.projectId, search: goal, limit: 12 });

    const steps = template.steps.map((step, index) => {
      const matches = this.skills.match(`${goal} ${step.title} ${step.objective}`, { agentId: step.agentId, limit: 6, enabledOnly: true });
      return {
        ...step,
        id: createId("step"),
        dependsOn: index === 0 ? [] : ["PREVIOUS_STEP"],
        skillIds: matches.map((match: SkillMatch) => match.skill.id),
        toolIds: this.selectTools(matches, availableToolIds),
      };
    });

    steps.forEach((step, index) => {
      step.dependsOn = index === 0 ? [] : [steps[index - 1].id];
    });

    const plan: ExecutionPlan = {
      id: createId("plan"),
      goal: goal.trim(),
      projectId: options?.projectId,
      createdAt: new Date().toISOString(),
      steps,
      contextKeys: context.map((memory) => memory.key),
    };

    this.memory.write({
      kind: "run",
      key: `plan:${plan.id}`,
      value: plan,
      projectId: plan.projectId,
      tags: ["planner", "execution-plan"],
    });

    return plan;
  }

  validate(plan: ExecutionPlan) {
    const ids = new Set(plan.steps.map((step) => step.id));
    const errors: string[] = [];

    plan.steps.forEach((step) => {
      if (!step.title.trim()) errors.push(`Step ${step.id} has no title`);
      if (!step.agentId.trim()) errors.push(`Step ${step.id} has no agent`);
      step.dependsOn.forEach((dependency) => {
        if (!ids.has(dependency)) errors.push(`Step ${step.id} depends on missing step ${dependency}`);
        if (dependency === step.id) errors.push(`Step ${step.id} depends on itself`);
      });
    });

    const visited = new Set<string>();
    const visiting = new Set<string>();
    const byId = new Map(plan.steps.map((step) => [step.id, step]));
    const visit = (id: string): boolean => {
      if (visiting.has(id)) return false;
      if (visited.has(id)) return true;
      visiting.add(id);
      for (const dependency of byId.get(id)?.dependsOn ?? []) {
        if (!visit(dependency)) return false;
      }
      visiting.delete(id);
      visited.add(id);
      return true;
    };

    for (const step of plan.steps) {
      if (!visit(step.id)) {
        errors.push("Plan contains a dependency cycle");
        break;
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private selectTools(matches: SkillMatch[], availableToolIds: string[]) {
    const requested = new Set(matches.flatMap((match) => match.skill.tools ?? []));
    return availableToolIds.filter((toolId) => requested.has(toolId));
  }
}

export const kernelPlanner = new KernelPlanner();
