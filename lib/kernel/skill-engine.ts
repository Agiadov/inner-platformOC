import { kernelMemory, type KernelMemoryEngine } from "@/lib/kernel/memory-engine";

export type SkillDefinition = {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  capabilities: string[];
  tools?: string[];
  version: string;
  enabled: boolean;
  metadata?: Record<string, unknown>;
};

export type AgentSkillProfile = {
  agentId: string;
  skillIds: string[];
};

export type SkillMatch = {
  skill: SkillDefinition;
  score: number;
  matchedTerms: string[];
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function unique(values: string[]) {
  return [...new Set(values.map(normalize).filter(Boolean))];
}

export class KernelSkillEngine {
  private skills = new Map<string, SkillDefinition>();
  private agentSkills = new Map<string, Set<string>>();

  constructor(private readonly memory: KernelMemoryEngine = kernelMemory) {}

  register(input: SkillDefinition) {
    const skill: SkillDefinition = {
      ...input,
      id: normalize(input.id),
      tags: unique(input.tags),
      capabilities: unique(input.capabilities),
      tools: unique(input.tools ?? []),
    };

    this.skills.set(skill.id, skill);
    this.memory.write({
      kind: "skill",
      key: `skill:${skill.id}`,
      value: skill,
      tags: [skill.category, ...skill.tags],
    });

    return skill;
  }

  unregister(skillId: string) {
    const id = normalize(skillId);
    const removed = this.skills.delete(id);
    this.agentSkills.forEach((skills) => skills.delete(id));
    return removed;
  }

  assign(agentId: string, skillIds: string[]) {
    const current = this.agentSkills.get(agentId) ?? new Set<string>();
    skillIds.map(normalize).forEach((skillId) => {
      if (!this.skills.has(skillId)) throw new Error(`Unknown skill: ${skillId}`);
      current.add(skillId);
    });
    this.agentSkills.set(agentId, current);
    return this.getAgentProfile(agentId);
  }

  revoke(agentId: string, skillIds: string[]) {
    const current = this.agentSkills.get(agentId);
    if (!current) return this.getAgentProfile(agentId);
    skillIds.map(normalize).forEach((skillId) => current.delete(skillId));
    return this.getAgentProfile(agentId);
  }

  get(skillId: string) {
    return this.skills.get(normalize(skillId));
  }

  list(filter?: { category?: string; enabledOnly?: boolean; tags?: string[] }) {
    const category = filter?.category ? normalize(filter.category) : undefined;
    const tags = unique(filter?.tags ?? []);

    return [...this.skills.values()]
      .filter((skill) => !category || normalize(skill.category) === category)
      .filter((skill) => !filter?.enabledOnly || skill.enabled)
      .filter((skill) => tags.every((tag) => skill.tags.includes(tag)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getAgentProfile(agentId: string): AgentSkillProfile {
    return {
      agentId,
      skillIds: [...(this.agentSkills.get(agentId) ?? new Set<string>())],
    };
  }

  getAgentSkills(agentId: string) {
    return this.getAgentProfile(agentId).skillIds
      .map((skillId) => this.skills.get(skillId))
      .filter((skill): skill is SkillDefinition => Boolean(skill));
  }

  match(query: string, options?: { agentId?: string; limit?: number; enabledOnly?: boolean }): SkillMatch[] {
    const terms = unique(query.split(/[^a-zа-яё0-9+#.]+/gi));
    const pool = options?.agentId ? this.getAgentSkills(options.agentId) : this.list({ enabledOnly: options?.enabledOnly });

    return pool
      .map((skill) => {
        const weighted = [
          { value: skill.name, weight: 5 },
          { value: skill.description, weight: 3 },
          { value: skill.category, weight: 2 },
          ...skill.tags.map((value) => ({ value, weight: 3 })),
          ...skill.capabilities.map((value) => ({ value, weight: 4 })),
          ...(skill.tools ?? []).map((value) => ({ value, weight: 2 })),
        ];

        const matchedTerms = terms.filter((term) => weighted.some(({ value }) => normalize(value).includes(term)));
        const score = matchedTerms.reduce((total, term) => {
          return total + weighted.reduce((sum, item) => sum + (normalize(item.value).includes(term) ? item.weight : 0), 0);
        }, 0);

        return { skill, score, matchedTerms };
      })
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
      .slice(0, options?.limit ?? 8);
  }

  export() {
    return {
      skills: [...this.skills.values()],
      profiles: [...this.agentSkills.entries()].map(([agentId, skillIds]) => ({ agentId, skillIds: [...skillIds] })),
    };
  }

  hydrate(input: { skills: SkillDefinition[]; profiles?: AgentSkillProfile[] }) {
    this.skills.clear();
    this.agentSkills.clear();
    input.skills.forEach((skill) => this.register(skill));
    input.profiles?.forEach((profile) => this.assign(profile.agentId, profile.skillIds));
  }
}

export const kernelSkills = new KernelSkillEngine();
