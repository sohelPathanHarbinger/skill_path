// IndexedDB persistence. This is the only file that knows where data lives:
// swap it for API calls to a real backend later without touching the UI.
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Track } from "./types";

interface SkillPathDB extends DBSchema {
  tracks: {
    key: string;
    value: Track;
    indexes: { "by-updated": number };
  };
}

let dbPromise: Promise<IDBPDatabase<SkillPathDB>> | null = null;

function db(): Promise<IDBPDatabase<SkillPathDB>> {
  dbPromise ??= openDB<SkillPathDB>("skillpath", 1, {
    upgrade(database) {
      const store = database.createObjectStore("tracks", { keyPath: "id" });
      store.createIndex("by-updated", "updatedAt");
    },
  });
  return dbPromise;
}

export async function listTrackRecords(): Promise<Track[]> {
  const tracks = await (await db()).getAllFromIndex("tracks", "by-updated");
  return tracks.reverse();
}

export async function getTrackRecord(id: string): Promise<Track | undefined> {
  return (await db()).get("tracks", id);
}

export async function putTrackRecord(track: Track): Promise<void> {
  await (await db()).put("tracks", track);
}

export async function deleteTrackRecord(id: string): Promise<void> {
  await (await db()).delete("tracks", id);
}
