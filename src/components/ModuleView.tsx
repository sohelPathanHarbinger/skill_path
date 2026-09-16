import { useEffect, useState } from "react";
import { navigate } from "../hooks/useHashRoute";
import { useTrack } from "../hooks/useTrack";
import { STATUS_LABEL, updateModule } from "../lib/progress";
import { COST_LABEL, PLATFORMS, resourceLinks } from "../lib/resources";
import type { PlanModule, Track, UpdateTrack } from "../lib/types";
import { QuizPanel } from "./QuizPanel";
import { NotFound } from "./TrackPage";
import { TutorChat } from "./TutorChat";
import { Badge, Spinner } from "./ui";

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
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        <a href={`#/track/${track.id}`} className="text-sm text-slate-500 hover:text-slate-800">
          ← {track.skill} plan
        </a>
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
        <details className="rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-slate-200">
          <summary className="cursor-pointer font-medium text-slate-800">
            Recommended materials for this module ({materials.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {materials.map((resource, i) => {
              const { find } = resourceLinks(resource);
              return (
                <li key={`${resource.title}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="min-w-0">
                    <span className="font-medium text-slate-900">{resource.title}</span>{" "}
                    <span className="text-slate-500">
                      · {PLATFORMS[resource.platform].name} · {COST_LABEL[resource.cost]}
                    </span>
                  </span>
                  <a href={find.href} target="_blank" rel="noreferrer" className="shrink-0 text-indigo-600 hover:underline">
                    {find.label} ↗
                  </a>
                </li>
              );
            })}
          </ul>
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
  );
}
