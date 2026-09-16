import { useCallback, useEffect, useState } from "react";
import { cachedTrack, loadTrack, subscribeTrack, updateTrack } from "../lib/trackStore";
import type { Track, UpdateTrack } from "../lib/types";

/** undefined while loading, null when the track doesn't exist. */
export function useTrack(trackId: string): { track: Track | null | undefined; update: UpdateTrack } {
  const [track, setTrack] = useState<Track | null | undefined>(() => cachedTrack(trackId));

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeTrack(trackId, setTrack);
    loadTrack(trackId).then((loaded) => {
      if (active) setTrack(loaded);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [trackId]);

  const update = useCallback<UpdateTrack>((mutate) => updateTrack(trackId, mutate), [trackId]);

  return { track, update };
}
