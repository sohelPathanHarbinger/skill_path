// What the learner has typed into the "What do you want to learn?" form, kept
// until their skill check really starts, so an AI error never loses it.
export interface TrackDraft {
  skill: string;
  goal: string;
  background: string;
  /** The track created from this draft whose skill check hasn't started yet. */
  trackId?: string;
}

const STORAGE_KEY = "skillpath.newTrackDraft";

export function loadTrackDraft(): TrackDraft {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    const d = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const text = (value: unknown) => (typeof value === "string" ? value : "");
    return {
      skill: text(d.skill),
      goal: text(d.goal),
      background: text(d.background),
      trackId: typeof d.trackId === "string" ? d.trackId : undefined,
    };
  } catch {
    return { skill: "", goal: "", background: "" };
  }
}

export function saveTrackDraft(draft: TrackDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // storage unavailable: the draft lives only while the page is open
  }
}

/** Called once a track's first question has arrived: the form starts fresh next time. */
export function clearTrackDraft(trackId: string): void {
  if (loadTrackDraft().trackId !== trackId) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing stored
  }
}
