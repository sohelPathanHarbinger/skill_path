import { useSyncExternalStore } from "react";
import { getSettings, subscribeSettings, type Settings } from "../lib/settings";

export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, getSettings);
}
