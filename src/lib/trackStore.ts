// In-memory cache over storage.ts so every screen showing the same track sees
// the same, latest copy, even while a slow Claude call finishes in the background.
import {
  deleteTrackRecord,
  getTrackRecord,
  listTrackRecords,
  putTrackRecord,
  requestPersistentStorage,
} from "./storage";
import type { Track } from "./types";

const cache = new Map<string, Track>();
const listeners = new Map<string, Set<(track: Track) => void>>();
const listListeners = new Set<() => void>();

function listChanged(): void {
  listListeners.forEach((listener) => listener());
}

export function cachedTrack(id: string): Track | undefined {
  return cache.get(id);
}

export async function loadTrack(id: string): Promise<Track | null> {
  const cached = cache.get(id);
  if (cached) return cached;
  const stored = await getTrackRecord(id);
  if (stored) cache.set(id, stored);
  return stored ?? null;
}

export function listTracks(): Promise<Track[]> {
  return listTrackRecords();
}

export async function createTrack(input: { skill: string; goal: string; background: string }): Promise<Track> {
  const now = Date.now();
  const track: Track = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: now,
    updatedAt: now,
    stage: "assessment",
    assessment: [],
    profile: null,
    plan: null,
    chats: {},
    quizzes: {},
  };
  cache.set(track.id, track);
  await putTrackRecord(track);
  listChanged();
  void requestPersistentStorage();
  return track;
}

/** Saves a whole track as it is, e.g. one restored from a backup. */
export async function putTrack(track: Track): Promise<void> {
  cache.set(track.id, track);
  listeners.get(track.id)?.forEach((listener) => listener(track));
  await putTrackRecord(track);
  listChanged();
}

export async function updateTrack(id: string, mutate: (track: Track) => Track): Promise<void> {
  const current = cache.get(id) ?? (await getTrackRecord(id));
  if (!current) return;
  const next = { ...mutate(current), updatedAt: Date.now() };
  cache.set(id, next);
  listeners.get(id)?.forEach((listener) => listener(next));
  await putTrackRecord(next);
}

export async function removeTrack(id: string): Promise<void> {
  cache.delete(id);
  await deleteTrackRecord(id);
  listChanged();
}

/** Called whenever a track is added, restored or deleted. */
export function subscribeTrackList(listener: () => void): () => void {
  listListeners.add(listener);
  return () => {
    listListeners.delete(listener);
  };
}

export function subscribeTrack(id: string, listener: (track: Track) => void): () => void {
  let set = listeners.get(id);
  if (!set) {
    set = new Set();
    listeners.set(id, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}
