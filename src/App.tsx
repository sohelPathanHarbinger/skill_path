import { useEffect } from "react";
import { AppMenu } from "./components/AppMenu";
import { Home } from "./components/Home";
import { ModulePage } from "./components/ModuleView";
import { SettingsDialog } from "./components/SettingsDialog";
import { TrackPage } from "./components/TrackPage";
import { useHashRoute } from "./hooks/useHashRoute";
import { useSettings } from "./hooks/useSettings";
import { closeSettingsDialog, openSettingsDialog, useSettingsDialogOpen } from "./hooks/useSettingsDialog";
import { COPYRIGHT, DEVELOPER } from "./lib/appInfo";

// One fluid width for header, page and footer: it fills the window up to 1600px,
// with side padding that grows on larger screens.
const SHELL = "mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8";

export default function App() {
  const route = useHashRoute();
  const { config, problem } = useSettings();
  const settingsOpen = useSettingsDialogOpen();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className={`${SHELL} flex items-center justify-between py-3`}>
          <a href="#/" className="flex items-center gap-2 font-semibold text-slate-900">
            <img src="favicon.svg" alt="" className="h-8 w-8" />
            SkillPath
          </a>
          <div className="flex items-center gap-1">
            <button
              onClick={openSettingsDialog}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              <span className="hidden sm:inline">{config.providerName}</span>
              <span className="sm:hidden">Settings</span>
              <span
                className={`h-2 w-2 rounded-full ${problem ? "bg-amber-500" : "bg-emerald-500"}`}
                title={problem ?? "Ready"}
              />
            </button>
            <AppMenu />
          </div>
        </div>
      </header>

      <main className={`${SHELL} flex-1 py-8`}>
        {route.name === "home" ? (
          <Home />
        ) : route.name === "track" ? (
          <TrackPage key={route.trackId} trackId={route.trackId} />
        ) : (
          <ModulePage key={`${route.trackId}/${route.moduleId}`} trackId={route.trackId} moduleId={route.moduleId} />
        )}
      </main>

      <footer className={`${SHELL} space-y-1 py-6 text-center text-xs text-slate-400`}>
        <p>
          Your learning data stays on this device · AI: {config.providerName} · {config.model || "no model"}
          {config.effort && ` · Effort: ${config.effort}`}
        </p>
        <p>
          Designed &amp; developed by {DEVELOPER} · {COPYRIGHT}
        </p>
      </footer>

      {settingsOpen && <SettingsDialog onClose={closeSettingsDialog} />}
    </div>
  );
}
