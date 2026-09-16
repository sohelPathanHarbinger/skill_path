import { useCallback, useEffect, useRef, useState } from "react";
import { buildPlan, buildProfile } from "../lib/learning";
import { toPlan } from "../lib/progress";
import type { Track, UpdateTrack } from "../lib/types";
import { AIErrorPanel } from "./AIErrorPanel";
import { Card } from "./ui";

type Step = "profile" | "plan";

export function BuildingView({ track, update }: { track: Track; update: UpdateTrack }) {
  const [step, setStep] = useState<Step>(track.profile ? "plan" : "profile");
  const [error, setError] = useState<unknown>(null);
  const started = useRef(false);
  const failed = error !== null;

  const run = useCallback(async () => {
    setError(null);
    try {
      let profile = track.profile;
      if (!profile) {
        setStep("profile");
        const built = await buildProfile(track);
        profile = built;
        await update((t) => ({ ...t, profile: built }));
      }
      setStep("plan");
      const plan = await buildPlan(track, profile);
      await update((t) => ({ ...t, plan: toPlan(plan), stage: "learning" }));
    } catch (err) {
      setError(err);
    }
  }, [track, update]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  return (
    <div className="mx-auto max-w-lg space-y-4 pt-8">
      <Card className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold">Building your {track.skill} path</h1>
          <p className="mt-1 text-sm text-slate-600">This usually takes under a minute.</p>
        </div>
        <ul className="space-y-3 text-sm">
          <StepRow label="Analysing your answers" state={step === "profile" ? (failed ? "failed" : "active") : "done"} />
          <StepRow label="Designing your learning plan" state={step === "plan" ? (failed ? "failed" : "active") : "waiting"} />
        </ul>
      </Card>
      {failed && <AIErrorPanel error={error} onRetry={run} />}
    </div>
  );
}

function StepRow({ label, state }: { label: string; state: "waiting" | "active" | "done" | "failed" }) {
  return (
    <li className="flex items-center gap-3">
      {state === "active" && (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
      )}
      {state === "done" && (
        <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-xs text-white">✓</span>
      )}
      {state === "waiting" && <span className="h-5 w-5 rounded-full border-2 border-slate-200" />}
      {state === "failed" && (
        <span className="grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-xs text-white">!</span>
      )}
      <span className={state === "waiting" ? "text-slate-400" : "text-slate-800"}>{label}</span>
    </li>
  );
}
