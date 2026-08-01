import type { CrewRunPlan } from "@/lib/crew-orchestrator";
import { supabase } from "@/lib/supabase";

const storageKey = "lutoway-crew-runs-v1";

export function loadLocalCrewRuns(): CrewRunPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as CrewRunPlan[]) : [];
  } catch {
    window.localStorage.removeItem(storageKey);
    return [];
  }
}

export function saveLocalCrewRun(run: CrewRunPlan) {
  if (typeof window === "undefined") return;
  const next = [run, ...loadLocalCrewRuns()].slice(0, 30);
  window.localStorage.setItem(storageKey, JSON.stringify(next));
}

export async function loadCrewRuns(): Promise<CrewRunPlan[]> {
  if (!supabase) return loadLocalCrewRuns();

  const { data, error } = await supabase
    .from("crew_runs")
    .select("id,brief,project,status,created_at,steps,synthesis")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    brief: row.brief,
    project: row.project,
    status: row.status,
    createdAt: row.created_at,
    steps: row.steps,
    synthesis: row.synthesis,
  })) as CrewRunPlan[];
}

export async function saveCrewRun(run: CrewRunPlan) {
  saveLocalCrewRun(run);
  if (!supabase) return;

  const { error } = await supabase.from("crew_runs").upsert({
    id: run.id,
    brief: run.brief,
    project: run.project,
    status: run.status,
    created_at: run.createdAt,
    steps: run.steps,
    synthesis: run.synthesis,
  });

  if (error) throw error;
}
