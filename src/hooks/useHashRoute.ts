import { useMemo, useSyncExternalStore } from "react";

export type Route =
  | { name: "home" }
  | { name: "track"; trackId: string }
  | { name: "module"; trackId: string; moduleId: string };

function subscribe(callback: () => void): () => void {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

const getHash = () => window.location.hash;

export function parseRoute(hash: string): Route {
  const [first, trackId, third, moduleId] = hash.replace(/^#\/?/, "").split("/");
  if (first === "track" && trackId) {
    if (third === "module" && moduleId) return { name: "module", trackId, moduleId };
    return { name: "track", trackId };
  }
  return { name: "home" };
}

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash);
  return useMemo(() => parseRoute(hash), [hash]);
}

export function navigate(path: string): void {
  window.location.hash = path;
}
