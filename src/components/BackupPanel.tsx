import { useRef, useState, type ChangeEvent } from "react";
import { backupFileName, downloadBackup, restoreBackup, type RestoreResult } from "../lib/backup";
import { describeError } from "../lib/learning";
import { Button } from "./ui";

type Status = { ok: boolean; text: string } | null;

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function describeRestore(r: RestoreResult): string {
  if (r.added + r.updated + r.unchanged + r.skipped === 0) return "That backup has no tracks in it.";
  const parts = [`${r.added} added`, `${r.updated} updated`, `${r.unchanged} already up to date`];
  const skipped = r.skipped ? ` ${plural(r.skipped, "track")} couldn't be read and ${r.skipped === 1 ? "was" : "were"} left out.` : "";
  return `Restored: ${parts.join(", ")}.${skipped}`;
}

/** Download every track to a file, or restore tracks from one. */
export function BackupPanel() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function download() {
    setBusy(true);
    setStatus(null);
    try {
      const { fileName, count } = await downloadBackup();
      setStatus({ ok: true, text: `Downloaded ${fileName} with ${plural(count, "track")}. Keep the file somewhere safe.` });
    } catch (err) {
      setStatus({ ok: false, text: describeError(err) });
    } finally {
      setBusy(false);
    }
  }

  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await restoreBackup(file);
      setStatus({ ok: result.skipped === 0, text: describeRestore(result) });
    } catch (err) {
      setStatus({ ok: false, text: describeError(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 text-sm leading-relaxed text-slate-700">
      <p>
        Your tracks are saved only on this device. Download a backup to keep a copy, to move to another device, or to
        recover after clearing browser data. API keys and AI settings are never included.
      </p>

      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900">Back up</h3>
        <p>
          Saves all your tracks as one <b>.json</b> file, named like <code className="text-xs">{backupFileName()}</code>,
          to your downloads.
        </p>
        <Button onClick={download} disabled={busy}>
          Download backup
        </Button>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900">Restore</h3>
        <p>
          Pick a SkillPath backup: the <b>.json</b> file made by <b>Download backup</b>. Other files, such as .txt, can't
          be restored. Tracks in it are added. A track you already have is replaced only when the backup's copy is
          newer.
        </p>
        <input ref={fileInput} type="file" accept=".json,application/json" onChange={restore} className="hidden" />
        <Button variant="secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
          Choose backup file…
        </Button>
      </section>

      {status && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 ring-1 ${
            status.ok ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200"
          }`}
        >
          {status.text}
        </p>
      )}
    </div>
  );
}
