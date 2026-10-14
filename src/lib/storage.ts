// IndexedDB persistence. This is the only file that knows where data lives:
// swap it for API calls to a real backend later without touching the UI.
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Track } from "./types";

/** Encrypted bytes and the IV they were sealed with (see secrets.ts). */
export interface SealedData {
  iv: Uint8Array<ArrayBuffer>;
  data: ArrayBuffer;
}

interface SkillPathDB extends DBSchema {
  tracks: {
    key: string;
    value: Track;
    indexes: { "by-updated": number };
  };
  /** This device's encryption key and the encrypted API keys. Never backed up or exported. */
  secrets: {
    key: string;
    value: CryptoKey | SealedData;
  };
}

let dbPromise: Promise<IDBPDatabase<SkillPathDB>> | null = null;

function db(): Promise<IDBPDatabase<SkillPathDB>> {
  dbPromise ??= openDB<SkillPathDB>("skillpath", 2, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        const store = database.createObjectStore("tracks", { keyPath: "id" });
        store.createIndex("by-updated", "updatedAt");
      }
      if (oldVersion < 2) database.createObjectStore("secrets");
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

export async function getSecret(name: string): Promise<CryptoKey | SealedData | undefined> {
  return (await db()).get("secrets", name);
}

export async function putSecret(name: string, value: CryptoKey | SealedData): Promise<void> {
  await (await db()).put("secrets", value, name);
}

export async function deleteSecret(name: string): Promise<void> {
  await (await db()).delete("secrets", name);
}

/** Asks the browser not to clear this app's data by itself, e.g. when the device runs low on space. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    // Not supported: data is still saved, just without that extra protection.
  }
}
