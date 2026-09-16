import { useCallback, useEffect, useRef, useState } from "react";
import { recommendResources } from "../lib/learning";
import {
  COST_LABEL,
  FORMAT_LABEL,
  isFree,
  PLATFORMS,
  RESOURCE_GROUPS,
  RESOURCE_LEVEL_LABEL,
  resourceLinks,
} from "../lib/resources";
import type { LearningResource } from "../lib/schemas";
import type { Track, UpdateTrack } from "../lib/types";
import { AIErrorPanel } from "./AIErrorPanel";
import { Badge, Button, Card, Spinner } from "./ui";

/** Full courses, videos, websites and practice on different platforms, fitted to the learner. */
export function ResourcesPanel({ track, update }: { track: Track; update: UpdateTrack }) {
  const saved = track.resources ?? null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [group, setGroup] = useState("all");
  const [freeOnly, setFreeOnly] = useState(false);
  const started = useRef(false);

  const find = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await recommendResources(track);
      await update((t) => ({ ...t, resources: { ...list, at: Date.now() } }));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [track, update]);

  // Suggest resources the first time the dashboard opens after the plan is ready.
  useEffect(() => {
    if (started.current || saved) return;
    started.current = true;
    void find();
  }, [find, saved]);

  const all = saved?.resources ?? [];
  const inGroup = (r: LearningResource, id: string) =>
    id === "all" || (RESOURCE_GROUPS.find((g) => g.id === id)?.formats.includes(r.format) ?? false);
  const visible = all
    .filter((r) => inGroup(r, group) && (!freeOnly || isFree(r)))
    .sort((a, b) => Number(b.top_pick) - Number(a.top_pick));
  const tabs = [{ id: "all", label: "All" }, ...RESOURCE_GROUPS];

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">Courses & learning materials</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {saved?.summary ??
              `Full video courses, websites, books and practice for ${track.skill} on different platforms, picked for your goal and gaps.`}
          </p>
        </div>
        {saved && (
          <Button variant="secondary" onClick={find} disabled={loading}>
            {loading ? "Finding…" : "Suggest again"}
          </Button>
        )}
      </div>

      {loading && !saved && <Spinner label="Finding the best courses and materials for you…" />}
      {error !== null && <AIErrorPanel error={error} onRetry={find} />}

      {saved && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
              {tabs.map((tab) => {
                const count = all.filter((r) => inGroup(r, tab.id) && (!freeOnly || isFree(r))).length;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={group === tab.id}
                    onClick={() => setGroup(tab.id)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      group === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab.label} <span className="text-slate-400">{count}</span>
                  </button>
                );
              })}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(e) => setFreeOnly(e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              Free only
            </label>
          </div>

          {visible.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {visible.map((resource, i) => (
                <ResourceCard key={`${resource.platform}-${resource.title}-${i}`} resource={resource} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No suggestions match these filters.</p>
          )}

          <p className="text-xs leading-relaxed text-slate-500">
            Suggested by the AI from what it knows. "Find on …" searches each platform for the exact title, so you land on
            the current version. Check the price, reviews and date there before enrolling.
          </p>
        </>
      )}
    </Card>
  );
}

function ResourceCard({ resource }: { resource: LearningResource }) {
  const { find, direct } = resourceLinks(resource);
  const details = [
    FORMAT_LABEL[resource.format],
    resource.author && `by ${resource.author}`,
    RESOURCE_LEVEL_LABEL[resource.level],
    resource.hours > 0 && `~${Math.round(resource.hours)} h`,
  ].filter(Boolean);

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl p-4 ring-1 ${
        resource.top_pick ? "bg-indigo-50/60 ring-indigo-200" : "bg-white ring-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {resource.top_pick && <Badge tone="indigo">★ Top pick</Badge>}
        <Badge>{PLATFORMS[resource.platform].name}</Badge>
        <Badge tone={isFree(resource) ? "emerald" : "amber"}>{COST_LABEL[resource.cost]}</Badge>
      </div>
      <div>
        <h3 className="font-medium leading-snug text-slate-900">{resource.title}</h3>
        <p className="mt-0.5 text-xs text-slate-500">{details.join(" · ")}</p>
      </div>
      <p className="text-sm leading-relaxed text-slate-600">{resource.why}</p>
      {resource.covers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {resource.covers.map((topic) => (
            <span key={topic} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {topic}
            </span>
          ))}
        </div>
      )}
      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm">
        <a href={find.href} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:underline">
          {find.label} ↗
        </a>
        {direct && (
          <a href={direct.href} target="_blank" rel="noreferrer" className="text-slate-500 hover:underline">
            {direct.label} ↗
          </a>
        )}
      </div>
    </div>
  );
}
