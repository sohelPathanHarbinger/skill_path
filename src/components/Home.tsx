import { useEffect, useState, type FormEvent } from "react";
import { navigate } from "../hooks/useHashRoute";
import { useSettings } from "../hooks/useSettings";
import { LEVEL_LABEL, planProgress } from "../lib/progress";
import { loadTrackDraft, saveTrackDraft, type TrackDraft } from "../lib/trackDraft";
import { createTrack, listTracks, loadTrack, updateTrack } from "../lib/trackStore";
import type { Track } from "../lib/types";
import { AIQuickSwitch } from "./AIQuickSwitch";
import { Badge, Bar, Button, Card } from "./ui";

const SUGGESTIONS = ["Python", "TypeScript", "React", "Node.js", "SQL", "Docker", "Git", "AWS"];

export function Home() {
  const [tracks, setTracks] = useState<Track[] | null>(null);

  useEffect(() => {
    listTracks().then(setTracks);
  }, []);

  return (
    <div className="space-y-12">
      <section className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <h1 className="text-3xl font-semibold tracking-tight">What do you want to learn?</h1>
          <p className="text-slate-600">
            Pick a skill and tell me your goal. I'll ask a few questions to find your current level, then build a plan
            and teach you one module at a time.
          </p>
          <ol className="space-y-2 pt-2 text-sm text-slate-600">
            <li>
              <span className="font-semibold text-indigo-600">1.</span> Short adaptive skill check
            </li>
            <li>
              <span className="font-semibold text-indigo-600">2.</span> Your skill profile and personal plan
            </li>
            <li>
              <span className="font-semibold text-indigo-600">3.</span> Two-way lessons and quizzes that adapt as you go
            </li>
          </ol>
        </div>
        <Card className="lg:col-span-3">
          <NewTrackForm />
        </Card>
      </section>

      {tracks && tracks.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Your learning tracks</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function NewTrackForm() {
  const { problem } = useSettings();
  const [draft, setDraft] = useState<TrackDraft>(loadTrackDraft);
  const [saving, setSaving] = useState(false);

  // Keep what's typed, so coming back after an error doesn't lose it.
  useEffect(() => saveTrackDraft(draft), [draft]);

  const change = (patch: Partial<TrackDraft>) => setDraft((prev) => ({ ...prev, ...patch }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.skill.trim() || problem) return;
    setSaving(true);
    const input = { skill: draft.skill.trim(), goal: draft.goal.trim(), background: draft.background.trim() };
    // Reuse the track from an earlier attempt whose skill check never got its first question.
    const earlier = draft.trackId ? await loadTrack(draft.trackId) : null;
    let trackId: string;
    if (earlier && earlier.stage === "assessment" && earlier.assessment.length === 0) {
      await updateTrack(earlier.id, (t) => ({ ...t, ...input }));
      trackId = earlier.id;
    } else {
      trackId = (await createTrack(input)).id;
    }
    saveTrackDraft({ ...draft, trackId });
    navigate(`/track/${trackId}`);
  }

  const field =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
  const label = "block text-sm font-medium text-slate-700";

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="skill" className={label}>
          Skill or technology
        </label>
        <input
          id="skill"
          value={draft.skill}
          onChange={(e) => change({ skill: e.target.value })}
          placeholder="e.g. Python, Kubernetes, GraphQL"
          className={field}
          required
        />
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => change({ skill: s })}
              className={`rounded-full px-3 py-1 text-xs ring-1 transition ${
                draft.skill === s
                  ? "bg-indigo-600 text-white ring-indigo-600"
                  : "bg-white text-slate-600 ring-slate-200 hover:ring-indigo-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="goal" className={label}>
          What's your goal?
        </label>
        <textarea
          id="goal"
          value={draft.goal}
          onChange={(e) => change({ goal: e.target.value })}
          rows={2}
          placeholder="e.g. Build REST APIs for my team's internal tools"
          className={field}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="background" className={label}>
          What have you done with it so far?
        </label>
        <textarea
          id="background"
          value={draft.background}
          onChange={(e) => change({ background: e.target.value })}
          rows={2}
          placeholder={"e.g. \"Nothing yet, but I know JavaScript well\""}
          className={field}
        />
      </div>
      <div className="space-y-2">
        <span className={label}>Which AI should teach you?</span>
        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <AIQuickSwitch />
        </div>
      </div>
      <Button type="submit" disabled={!draft.skill.trim() || saving || Boolean(problem)} className="w-full sm:w-auto">
        Start skill check →
      </Button>
    </form>
  );
}

function TrackCard({ track }: { track: Track }) {
  const progress = planProgress(track.plan);
  const status =
    track.stage === "assessment"
      ? track.assessment.length
        ? "Skill check in progress"
        : "Skill check not started"
      : track.stage === "building"
        ? "Building your plan"
        : `${progress.done} of ${progress.total} modules complete`;

  return (
    <a
      href={`#/track/${track.id}`}
      className="group block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-indigo-300"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold group-hover:text-indigo-700">{track.skill}</h3>
        {track.profile && <Badge tone="indigo">{LEVEL_LABEL[track.profile.level]}</Badge>}
      </div>
      {track.goal && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{track.goal}</p>}
      <div className="mt-4 space-y-2">
        {track.stage === "learning" && <Bar value={progress.percent} />}
        <p className="text-xs text-slate-500">{status}</p>
      </div>
    </a>
  );
}
