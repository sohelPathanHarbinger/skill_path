import { useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/** Whether the device has a network connection, as far as the browser knows. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine);
}
