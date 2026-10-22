import { useSyncExternalStore } from "react";

// The browser's offer to install SkillPath as an app (Chrome, Edge, Android). It
// arrives once, soon after the page loads, so it's caught here at startup and kept
// for the menu's "Install app" item. Safari has no such offer: iPhone and iPad users
// install with Share → Add to Home Screen.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

let offer: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

window.addEventListener("beforeinstallprompt", (event) => {
  // Keep the offer for our own button instead of the browser's mini bar.
  event.preventDefault();
  offer = event as BeforeInstallPromptEvent;
  emit();
});

window.addEventListener("appinstalled", () => {
  offer = null;
  emit();
});

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether the browser currently offers to install the app. */
export function useCanInstall(): boolean {
  return useSyncExternalStore(subscribe, () => offer !== null);
}

/** Shows the browser's install prompt. An offer can be used only once. */
export async function promptInstall(): Promise<void> {
  const current = offer;
  if (!current) return;
  offer = null;
  emit();
  await current.prompt();
}

/** Whether SkillPath is running as an installed app rather than in a browser tab. */
export function isInstalledApp(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone or iPad, where apps are installed from Safari's Share menu. */
export function isAppleMobile(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}
