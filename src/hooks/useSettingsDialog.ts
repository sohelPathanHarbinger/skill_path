import { useSyncExternalStore } from "react";

// Whether the Settings popup is open, shared so any screen can open it.
// It opens by itself once per browser tab, when the app starts.
const PROMPTED_KEY = "skillpath.settingsPrompted";

function promptedBefore(): boolean {
  try {
    return sessionStorage.getItem(PROMPTED_KEY) !== null;
  } catch {
    return false;
  }
}

let open = !promptedBefore();
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

export function useSettingsDialogOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open);
}
