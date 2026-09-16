import type { Level, LearningPlan, SkillProfile } from "./schemas";
import type { ModuleStatus, Plan, PlanModule, Track } from "./types";

export const PASS_SCORE = 70;

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: "Beginner",
  elementary: "Elementary",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

export const STATUS_LABEL: Record<ModuleStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Current overall mastery: the mean of the sub-topic estimates. */
export function averageMastery(profile: SkillProfile): number {
  if (profile.subtopics.length === 0) return clampScore(profile.score);
  const total = profile.subtopics.reduce((sum, s) => sum + s.mastery, 0);
  return clampScore(total / profile.subtopics.length);
}

export function masteryColor(value: number): string {
  if (value < 40) return "bg-rose-400";
  if (value < 70) return "bg-amber-400";
  return "bg-emerald-500";
}

export function applyMasteryUpdates(
  profile: SkillProfile,
  updates: { subtopic: string; mastery: number }[],
): SkillProfile {
  const subtopics = profile.subtopics.map((s) => ({ ...s }));
  for (const update of updates) {
    const key = update.subtopic.trim().toLowerCase();
    const match = subtopics.find((s) => s.name.trim().toLowerCase() === key);
    if (match) {
      match.mastery = clampScore(update.mastery);
    } else {
      subtopics.push({
        name: update.subtopic,
        mastery: clampScore(update.mastery),
        evidence: "Measured by a module quiz.",
      });
    }
  }
  return { ...profile, subtopics };
}

export function toPlan(plan: LearningPlan): Plan {
  return {
    overview: plan.overview,
    modules: plan.modules.map((m) => ({
      ...m,
      id: crypto.randomUUID(),
      status: "not_started",
      bestScore: null,
    })),
  };
}

export function updateModule(
  track: Track,
  moduleId: string,
  patch: (module: PlanModule) => Partial<PlanModule>,
): Track {
  if (!track.plan) return track;
  return {
    ...track,
    plan: {
      ...track.plan,
      modules: track.plan.modules.map((m) => (m.id === moduleId ? { ...m, ...patch(m) } : m)),
    },
  };
}

export function planProgress(plan: Plan | null): { done: number; total: number; percent: number } {
  const total = plan?.modules.length ?? 0;
  const done = plan?.modules.filter((m) => m.status === "completed").length ?? 0;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}
