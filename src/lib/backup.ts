// Backs up every learning track to a JSON file and restores tracks from one.
// Only tracks are included: AI settings and API keys never leave the device this way.
import { z } from "zod";
import {
  AssessmentTurnSchema,
  LearningPlanSchema,
  QuizGradeSchema,
  QuizSchema,
  ResourceListSchema,
  SkillProfileSchema,
} from "./schemas";
import { requestPersistentStorage } from "./storage";
import { listTracks, loadTrack, putTrack } from "./trackStore";
import type { Track } from "./types";

const FORMAT = "skillpath-backup";
const VERSION = 1;

const PlanModuleSchema = LearningPlanSchema.shape.modules.element.extend({
  id: z.string(),
  status: z.enum(["not_started", "in_progress", "completed"]),
  bestScore: z.number().nullable(),
});

/** A track as saved in IndexedDB (see types.ts), checked before it's restored. */
const TrackSchema = z.object({
  id: z.string().min(1),
  skill: z.string(),
  goal: z.string(),
  background: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  stage: z.enum(["assessment", "building", "learning"]),
  assessment: z.array(z.object({ turn: AssessmentTurnSchema, answer: z.string().nullable() })),
  profile: SkillProfileSchema.nullable(),
  plan: z.object({ overview: z.string(), modules: z.array(PlanModuleSchema) }).nullable(),
  chats: z.record(z.string(), z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string() }))),
  quizzes: z.record(
    z.string(),
    z.array(
      z.object({ quiz: QuizSchema, answers: z.array(z.string()), grade: QuizGradeSchema.nullable(), at: z.number() }),
    ),
  ),
  resources: ResourceListSchema.extend({ at: z.number() }).nullable().optional(),
}) satisfies z.ZodType<Track>;

const BackupSchema = z.object({
  format: z.literal(FORMAT),
  version: z.number(),
  tracks: z.array(z.unknown()),
});

export interface RestoreResult {
  added: number;
  updated: number;
  /** Already on this device in the same or a newer state. */
  unchanged: number;
  /** Damaged entries that were left out. */
  skipped: number;
}

/** The name a backup made on this date is saved under, e.g. skillpath-backup-2026-10-14.json. */
export function backupFileName(date = new Date()): string {
  return `skillpath-backup-${date.toISOString().slice(0, 10)}.json`;
}

/** Downloads every track as one JSON file. Returns the file name and how many tracks it holds. */
export async function downloadBackup(): Promise<{ fileName: string; count: number }> {
  const tracks = await listTracks();
  const backup = { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), tracks };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  const fileName = backupFileName();
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return { fileName, count: tracks.length };
}

/**
 * Restores the tracks in a backup file. New tracks are added; a track already on this
 * device is replaced only when the backup's copy is newer.
 */
export async function restoreBackup(file: File): Promise<RestoreResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn't a SkillPath backup. Pick the .json file made by Download backup.");
  }
  const backup = BackupSchema.safeParse(parsed);
  if (!backup.success) throw new Error("That file isn't a SkillPath backup, or it has been changed or damaged. Pick the .json file made by Download backup.");
  if (backup.data.version > VERSION) {
    throw new Error("This backup was made by a newer version of SkillPath. Update the app, then try again.");
  }

  const result: RestoreResult = { added: 0, updated: 0, unchanged: 0, skipped: 0 };
  for (const entry of backup.data.tracks) {
    const track = TrackSchema.safeParse(entry);
    if (!track.success) {
      result.skipped++;
      continue;
    }
    const existing = await loadTrack(track.data.id);
    if (existing && existing.updatedAt >= track.data.updatedAt) {
      result.unchanged++;
      continue;
    }
    await putTrack(track.data);
    if (existing) result.updated++;
    else result.added++;
  }
  if (result.added + result.updated > 0) void requestPersistentStorage();
  return result;
}
