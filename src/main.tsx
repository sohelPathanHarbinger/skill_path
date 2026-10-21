import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { openSettingsIfNeeded } from "./hooks/useSettingsDialog";
import { initSettings } from "./lib/settings";
import "./index.css";

// Unlock the saved API keys before the first render, so the app starts ready to use,
// and only then decide whether Settings needs to open. If storage is slow to open,
// render anyway: the keys apply (and Settings opens if needed) as soon as they load.
const settingsReady = initSettings().then(openSettingsIfNeeded);
const keysLoaded = Promise.race([settingsReady, new Promise((resolve) => setTimeout(resolve, 2000))]);

void keysLoaded.finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
