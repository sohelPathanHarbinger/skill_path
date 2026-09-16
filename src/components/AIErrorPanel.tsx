import { useState } from "react";
import { AIError } from "../lib/ai";
import type { AIErrorKind } from "../lib/ai/errors";
import { describeError } from "../lib/learning";
import { AIQuickSwitch } from "./AIQuickSwitch";
import { Button } from "./ui";

// Errors that switching the AI, model or key usually fixes: show the switcher right away.
const OPEN_FOR: AIErrorKind[] = ["setup", "auth", "billing", "permission", "not_found", "rate_limit", "network", "invalid_output"];

/** An error message with Try again, plus a way to change the AI or model on the spot. */
export function AIErrorPanel({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const kind = error instanceof AIError ? error.kind : null;
  const [switching, setSwitching] = useState(kind !== null && OPEN_FOR.includes(kind));

  return (
    <div className="space-y-3 rounded-xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-rose-800">
        <span className="min-w-0 flex-1">{describeError(error)}</span>
        <div className="flex flex-wrap gap-2">
          {kind && !switching && (
            <Button variant="secondary" onClick={() => setSwitching(true)}>
              Change AI or model
            </Button>
          )}
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      </div>
      {kind && switching && (
        <div className="space-y-2 rounded-lg bg-white p-4 ring-1 ring-rose-100">
          <p className="text-sm font-medium text-slate-800">Change the AI or model, then click Try again</p>
          <AIQuickSwitch autoLoadModels={kind === "not_found"} />
        </div>
      )}
    </div>
  );
}
