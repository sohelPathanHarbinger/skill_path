// The one entry point the app uses for AI. It sends each request to whichever
// provider is selected in Settings.
import { getSettings } from "../settings";
import { anthropicListModels, anthropicStream, anthropicStructured } from "./anthropic";
import { AIError } from "./errors";
import { compatListModels, compatStream, compatStructured } from "./openaiCompatible";
import type { AIConfig, StreamRequest, StructuredRequest } from "./types";

export { AIError, isAbortError } from "./errors";

function activeConfig(): AIConfig {
  const { config, problem } = getSettings();
  if (problem) throw new AIError("setup", problem);
  return config;
}

/** A request whose reply must match `req.schema`. */
export function aiStructured<T>(req: StructuredRequest<T>): Promise<T> {
  const config = activeConfig();
  return config.provider.kind === "anthropic" ? anthropicStructured(config, req) : compatStructured(config, req);
}

/** A streamed plain-text reply. Resolves with the full text. */
export function aiStream(req: StreamRequest): Promise<string> {
  const config = activeConfig();
  return config.provider.kind === "anthropic" ? anthropicStream(config, req) : compatStream(config, req);
}

/** Model ids the provider currently offers (used by "Load models" in Settings). */
export function listModels(config: AIConfig): Promise<string[]> {
  return config.provider.kind === "anthropic" ? anthropicListModels(config) : compatListModels(config);
}
