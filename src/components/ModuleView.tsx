import { useEffect, useState } from "react";
import { navigate } from "../hooks/useHashRoute";
import { useTrack } from "../hooks/useTrack";
import { planProgress, STATUS_LABEL, updateModule } from "../lib/progress";
import { COST_LABEL, PLATFORMS, resourceLinks } from "../lib/resources";
import type { LearningResource } from "../lib/schemas";
import type { PlanModule, Track, UpdateTrack } from "../lib/types";
import { StatusDot } from "./Dashboard";
import { QuizPanel } from "./QuizPanel";
import { NotFound } from "./TrackPage";
import { TutorChat } from "./TutorChat";
import { BackLink, Badge, SidePanel, Spinner } from "./ui";

export function ModulePage({ trackId, moduleId }: { trackId: string; moduleId: string }) {
  const { track, update } = useTrack(trackId);

  if (track === undefined) return <Spinner label="Loading…" />;
  const module = track?.plan?.modules.find((m) => m.id === moduleId);
  if (!track || !module) return <NotFound what="module" />;

  return <ModuleView track={track} module={module} update={update} />;
}

type Tab = "lesson" | "quiz";

function ModuleView({ track, module, update }: { track: Track; module: PlanModule; update: UpdateTrack }) {
  const [tab, setTab] = useState<Tab>("lesson");
  const modules = track.plan?.modules ?? [];
  const index = modules.findIndex((m) => m.id === module.id);
  const next = modules[index + 1];
  const materials = (track.resources?.resources ?? []).filter((r) => r.modules.includes(index + 1));

  useEffect(() => {
    if (module.status === "not_started") {
      void update((t) => updateModule(t, module.id, () => ({ status: "in_progress" })));
    }
  }, [module.id, module.status, update]);

  return (
    // Lesson column at a comfortable reading width; on wide screens the plan and the
    // module's materials sit in a side column that scrolls on its own.
    <div className="mx-auto grid max-w-7xl items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-6">
        <header className="space-y-3">
          <BackLink href={`#/track/${track.id}`}>{track.skill} plan</BackLink>
          <div className="space-y-2">
            <p className="text-sm font-medium text-indigo-600">
              Module {index + 1} of {modules.length}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{module.title}</h1>
              <Badge tone={module.status === "completed" ? "emerald" : "slate"}>{STATUS_LABEL[module.status]}</Badge>
            </div>
            <p className="text-slate-600">
              <span className="font-medium text-slate-800">Objective:</span> {module.objective}
            </p>
            <div className="flex flex-wrap gap-2">
              {module.subtopics.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
          </div>
        </header>

        {materials.length > 0 && (
          <details className="rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-slate-200 lg:hidden">
            <summary className="cursor-pointer font-medium text-slate-800">
              Recommended materials for this module ({materials.length})
            </summary>
            <MaterialsList materials={materials} />
          </details>
        )}

        <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
          {(["lesson", "quiz"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t === "lesson" ? "Lesson" : "Quiz"}
            </button>
          ))}
        </div>

        {/* Both stay mounted so a reply keeps streaming while you look at the quiz. */}
        <div hidden={tab !== "lesson"}>
          <TutorChat track={track} module={module} update={update} />
        </div>
        <div hidden={tab !== "quiz"}>
          <QuizPanel
            track={track}
            module={module}
            update={update}
            onBackToLesson={() => setTab("lesson")}
            onNextModule={next ? () => navigate(`/track/${track.id}/module/${next.id}`) : undefined}
          />
        </div>
      </div>

      <aside className="hidden space-y-4 lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
        <PlanNav track={track} currentId={module.id} />
        {materials.length > 0 && (
          <SidePanel title="Recommended materials" aside={materials.length}>
            <MaterialsList materials={materials} />
          </SidePanel>
        )}
      </aside>
    </div>
  );
}

/** Every module in the plan, so the learner can see where they are and jump. */
function PlanNav({ track, currentId }: { track: Track; currentId: string }) {
  const plan = track.plan;
  if (!plan) return null;
  const progress = planProgress(plan);
  return (
    <SidePanel title="Your plan" aside={`${progress.done}/${progress.total} done`}>
      <ol className="space-y-1">
        {plan.modules.map((m, i) => (
          <li key={m.id}>
            <a
              href={`#/track/${track.id}/module/${m.id}`}
              aria-current={m.id === currentId ? "page" : undefined}
              className={`flex items-start gap-3 rounded-lg p-2 text-sm transition ${
                m.id === currentId ? "bg-indigo-50 ring-1 ring-indigo-200" : "hover:bg-slate-50"
              }`}
            >
              <StatusDot status={m.status} index={i} />
              <span className="min-w-0">
                <span className="block font-medium text-slate-800">{m.title}</span>
                <span className="block text-xs text-slate-500">
                  ~{Math.round(m.estimated_minutes)} min · {STATUS_LABEL[m.status]}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </SidePanel>
  );
}

function MaterialsList({ materials }: { materials: LearningResource[] }) {
  return (
    <ul className="mt-3 space-y-3 text-sm lg:mt-0">
      {materials.map((resource, i) => {
        const { find } = resourceLinks(resource);
        return (
          <li key={`${resource.title}-${i}`} className="space-y-0.5">
            <p className="font-medium text-slate-900">{resource.title}</p>
            <p className="text-xs text-slate-500">
              {PLATFORMS[resource.platform].name} · {COST_LABEL[resource.cost]}
            </p>
            <a href={find.href} target="_blank" rel="noreferrer" className="text-xs font-medium text-indigo-600 hover:underline">
              {find.label} ↗
            </a>
          </li>
        );
      })}
    </ul>
  );
}
