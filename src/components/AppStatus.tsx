import { useRegisterSW } from "virtual:pwa-register/react";
import { useOnline } from "../hooks/useOnline";
import { Button } from "./ui";

const HOUR = 60 * 60 * 1000;

/** The offline notice under the header. */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-800 ring-1 ring-amber-200">
      You're offline. Your saved tracks still open, but lessons, quizzes and new tracks need an internet connection.
    </div>
  );
}

/**
 * Registers the service worker that makes SkillPath work offline, and offers a reload
 * when a new version has been deployed.
 */
export function UpdateNotice() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // An installed app can stay open for days: look for a new version every hour.
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), HOUR);
    },
  });

  if (!needRefresh) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm shadow-lg ring-1 ring-slate-200"
    >
      <span className="min-w-0 flex-1 text-slate-700">A new version of SkillPath is ready.</span>
      <Button variant="ghost" onClick={() => setNeedRefresh(false)}>
        Later
      </Button>
      <Button onClick={() => void updateServiceWorker()}>Reload</Button>
    </div>
  );
}
