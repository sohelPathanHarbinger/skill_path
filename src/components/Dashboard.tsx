import { navigate } from "../hooks/useHashRoute";
import { averageMastery, clampScore, LEVEL_LABEL, planProgress, STATUS_LABEL } from "../lib/progress";
import type { SkillProfile } from "../lib/schemas";
import { removeTrack } from "../lib/trackStore";
import type { ModuleStatus, Plan, PlanModule, Track, UpdateTrack } from "../lib/types";
import { ResourcesPanel } from "./ResourcesPanel";
import { Badge, Bar, Button, Card, difficultyTone, MasteryBar } from "./ui";

export function Dashboard({ track, update }: { track: Track; update: UpdateTrack }) {
  const { profile, plan } = track;

  if (!profile || !plan) {
    return (
      <Card className="mx-auto max-w-md space-y-3 text-center">
        <p className="text-slate-600">Your plan isn't ready yet.</p>
        <Button onClick={() => update((t) => ({ ...t, stage: "building" }))}>Build it now</Button>
      </Card>
    );
  }

  const nextModule = plan.modules.find((m) => m.status !== "completed");
  const openModule = (module: PlanModule) => navigate(`/track/${track.id}/module/${module.id}`);

  async function retake() {
    if (!window.confirm("Retake the skill check? Your profile, plan, lessons and quiz results for this track will be cleared.")) {
      return;
    }
    await update((t) => ({
      ...t,
      stage: "assessment",
      assessment: [],
      profile: null,
      plan: null,
      chats: {},
      quizzes: {},
      resources: null,
    }));
  }

  async function remove() {
    if (!window.confirm(`Delete the ${track.skill} track and all its progress?`)) return;
    await removeTrack(track.id);
    navigate("/");
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <a href="#/" className="text-sm text-slate-500 hover:text-slate-800">
            ← All tracks
          </a>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{track.skill}</h1>
          {track.goal && <p className="mt-1 text-slate-600">Goal: {track.goal}</p>}
        </div>
        {nextModule ? (
          <Button onClick={() => openModule(nextModule)}>
            {nextModule.status === "in_progress" ? "Continue" : "Start"} next module →
          </Button>
        ) : (
          <Badge tone="emerald">Plan complete 🎉</Badge>
        )}
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <ProfilePanel profile={profile} />
        </div>
        <div className="lg:col-span-3">
          <PlanPanel plan={plan} nextId={nextModule?.id} onOpen={openModule} />
        </div>
      </div>

      <ResourcesPanel track={track} update={update} />

      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6">
        <Button variant="secondary" onClick={retake}>
          Retake skill check
        </Button>
        <Button variant="danger" onClick={remove}>
          Delete track
        </Button>
      </div>
    </div>
  );
}

function ProfilePanel({ profile }: { profile: SkillProfile }) {
  return (
    <Card className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Skill profile</h2>
          <Badge tone="indigo">{LEVEL_LABEL[profile.level]}</Badge>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tabular-nums">{averageMastery(profile)}%</span>
          <span className="text-sm text-slate-500">overall mastery</span>
        </div>
        <p className="text-sm leading-relaxed text-slate-600">{profile.summary}</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">By sub-topic</h3>
        {profile.subtopics.map((s) => {
          const mastery = clampScore(s.mastery);
          return (
            <div key={s.name} className="space-y-1" title={s.evidence}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-slate-700">{s.name}</span>
                <span className="tabular-nums text-slate-500">{mastery}%</span>
              </div>
              <MasteryBar value={mastery} />
            </div>
          );
        })}
      </div>

      <InsightList title="Strengths" items={profile.strengths} dot="bg-emerald-500" />
      <InsightList title="Gaps to work on" items={profile.gaps} dot="bg-amber-500" />
      <InsightList title="Misconceptions to clear up" items={profile.misconceptions} dot="bg-rose-500" />
    </Card>
  );
}

function InsightList({ title, items, dot }: { title: string; items: string[]; dot: string }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-slate-600">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlanPanel({
  plan,
  nextId,
  onOpen,
}: {
  plan: Plan;
  nextId: string | undefined;
  onOpen: (module: PlanModule) => void;
}) {
  const progress = planProgress(plan);
  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Your learning plan</h2>
          <span className="text-sm text-slate-500">
            {progress.done}/{progress.total} done
          </span>
        </div>
        <Bar value={progress.percent} />
        <p className="text-sm leading-relaxed text-slate-600">{plan.overview}</p>
      </div>

      <ol className="space-y-3">
        {plan.modules.map((m, i) => (
          <li key={m.id}>
            <button
              onClick={() => onOpen(m)}
              className={`w-full rounded-xl p-4 text-left ring-1 transition hover:ring-indigo-400 ${
                m.id === nextId ? "bg-indigo-50/60 ring-indigo-300" : "bg-white ring-slate-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <StatusDot status={m.status} index={i} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-slate-900">{m.title}</h3>
                    <Badge tone={difficultyTone(m.difficulty)}>{m.difficulty}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{m.objective}</p>
                  <p className="text-xs italic text-slate-500">{m.why}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-500">
                    <span>~{Math.round(m.estimated_minutes)} min</span>
                    <span>{STATUS_LABEL[m.status]}</span>
                    {m.bestScore !== null && <span>Best quiz: {m.bestScore}%</span>}
                  </div>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function StatusDot({ status, index }: { status: ModuleStatus; index: number }) {
  if (status === "completed") {
    return (
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500 text-sm text-white">✓</span>
    );
  }
  return (
    <span
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-semibold ${
        status === "in_progress" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
      }`}
    >
      {index + 1}
    </span>
  );
}
