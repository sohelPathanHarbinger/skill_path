import { useSyncExternalStore } from "react";
import { getSettings } from "../lib/settings";

// Whether the Settings popup is open, shared so any screen can open it.
// At startup it opens by itself only when the chosen AI isn't ready (usually a
// missing API key), and then at most once per browser tab.
const PROMPTED_KEY = "skillpath.settingsPrompted";

function promptedBefore(): boolean {
  try {
    return sessionStorage.getItem(PROMPTED_KEY) !== null;
  } catch {
    return false;
  }
}

let open = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function openSettingsDialog(): void {
  open = true;
  emit();
}

export function closeSettingsDialog(): void {
  try {
    sessionStorage.setItem(PROMPTED_KEY, "1");
  } catch {
    // not remembered; the popup may show again on reload
  }
  open = false;
  emit();
}

/** Call once the saved keys have loaded: opens Settings if the chosen AI still needs something. */
export function openSettingsIfNeeded(): void {
  if (getSettings().problem && !promptedBefore()) openSettingsDialog();
}

export function useSettingsDialogOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open);
}
