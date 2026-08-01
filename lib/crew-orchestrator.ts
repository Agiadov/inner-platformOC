export type CrewAgentInput = {
  id: string;
  name: string;
  department: string;
  output: string;
};

export type CrewRunStep = {
  id: string;
  agentId: string;
  agentName: string;
  department: string;
  status: "queued" | "completed";
  objective: string;
  deliverable: string;
};

export type CrewRunPlan = {
  id: string;
  brief: string;
  project: string;
  createdAt: string;
  status: "completed";
  steps: CrewRunStep[];
  synthesis: string[];
};

function detectProject(brief: string) {
  const value = brief.toLowerCase();
  if (value.includes("inner")) return "INNER";
  if (value.includes("lutoway")) return "LUTOWAY OS";
  if (value.includes("soloclimb")) return "SoloClimb";
  return "Новый проект";
}

function objectiveFor(agent: CrewAgentInput, brief: string) {
  const goal = brief.trim().replace(/\s+/g, " ");
  return `${agent.name} анализирует задачу «${goal}» в зоне ${agent.department.toLowerCase()}.`;
}

export function buildCrewRun(brief: string, agents: CrewAgentInput[]): CrewRunPlan {
  const createdAt = new Date().toISOString();
  const id = `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const project = detectProject(brief);

  const steps = agents.map((agent, index) => ({
    id: `${id}-step-${index + 1}`,
    agentId: agent.id,
    agentName: agent.name,
    department: agent.department,
    status: "completed" as const,
    objective: objectiveFor(agent, brief),
    deliverable: agent.output,
  }));

  return {
    id,
    brief: brief.trim(),
    project,
    createdAt,
    status: "completed",
    steps,
    synthesis: [
      `Project Manager объединил ${steps.length} результатов в один план.`,
      `Все материалы привязаны к проекту ${project}.`,
      "Следующий шаг: подтвердить план и передать задачи агентам с подключёнными инструментами.",
    ],
  };
}
