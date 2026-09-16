import type { z } from "zod";

/** Removes <think>…</think> reasoning that some open models include in their reply (also an unfinished block while streaming). */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, "").replace(/^\s+/, "");
}

export function schemaInstruction(schema: Record<string, unknown>): string {
  return [
    "Reply with a single JSON object only: no prose before or after it and no Markdown code fences.",
    "It must match this JSON Schema exactly, using enum values verbatim:",
    JSON.stringify(schema),
  ].join("\n");
}

/** Pulls a JSON value out of a model reply, tolerating code fences and stray text around it. */
function extractJson(text: string): unknown {
  const cleaned = stripThinking(text).trim();
  const candidates = [cleaned, cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]];
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) candidates.push(cleaned.slice(start, end + 1));
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate.trim());
    } catch {
      // try the next candidate
    }
  }
  return undefined;
}

export type Checked<T> = { ok: true; value: T } | { ok: false; problem: string };

/** Parses and validates a reply against the schema, describing what's wrong when it doesn't fit. */
export function checkReply<T>(text: string, schema: z.ZodType<T>): Checked<T> {
  const data = extractJson(text);
  if (data === undefined) return { ok: false, problem: "it wasn't valid JSON" };
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, value: result.data };
  const issues = result.error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
  return { ok: false, problem: `it didn't match the required format (${issues})` };
}
