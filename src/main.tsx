import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initSettings } from "./lib/settings";
import "./index.css";

// Unlock the saved API keys before the first render, so the app starts ready to use.
// If storage is slow to open, render anyway: the keys apply as soon as they load.
const keysLoaded = Promise.race([initSettings(), new Promise((resolve) => setTimeout(resolve, 2000))]);

void keysLoaded.finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
