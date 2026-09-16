import { useEffect } from "react";
import { Home } from "./components/Home";
import { ModulePage } from "./components/ModuleView";
import { SettingsDialog } from "./components/SettingsDialog";
import { TrackPage } from "./components/TrackPage";
import { useHashRoute } from "./hooks/useHashRoute";
import { useSettings } from "./hooks/useSettings";
import { closeSettingsDialog, openSettingsDialog, useSettingsDialogOpen } from "./hooks/useSettingsDialog";

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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <a href="#/" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">S</span>
            SkillPath
          </a>
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
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {route.name === "home" ? (
          <Home />
        ) : route.name === "track" ? (
          <TrackPage key={route.trackId} trackId={route.trackId} />
        ) : (
          <ModulePage key={`${route.trackId}/${route.moduleId}`} trackId={route.trackId} moduleId={route.moduleId} />
        )}
      </main>

      <footer className="px-4 py-6 text-center text-xs text-slate-400">
        Your learning data stays in this browser · AI: {config.providerName} · {config.model || "no model"}
        {config.effort && ` · Effort: ${config.effort}`}
      </footer>

      {settingsOpen && <SettingsDialog onClose={closeSettingsDialog} />}
    </div>
  );
}
