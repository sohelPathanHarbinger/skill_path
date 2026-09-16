import type { z } from "zod";

/**
 * How a provider is asked for JSON, from most to least strict. If a provider
 * rejects one mode, requests fall back to the next.
 * - json_schema: the API enforces our schema
 * - json_object: the API guarantees JSON; the schema is described in the prompt
 * - prompt: the schema is described in the prompt only (works with any model)
 */
export type JsonMode = "json_schema" | "json_object" | "prompt";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ModelOption {
  id: string;
  label: string;
}

export interface ProviderDef {
  id: string;
  name: string;
  /** "anthropic" uses the Anthropic SDK; every other provider speaks the OpenAI-compatible Chat Completions API. */
  kind: "anthropic" | "openai-compatible";
  group: "default" | "free" | "paid" | "local" | "custom";
  baseUrl: string;
  /** Local servers and custom endpoints let the learner change the URL. */
  editableBaseUrl: boolean;
  keyRequired: boolean;
  keyUrl?: string;
  keyPlaceholder?: string;
  /** One line about free tiers, credits or pricing. */
  pricing: string;
  /** Extra setup tips shown in Settings. */
  notes?: string;
  /** Suggested models; any other id (or one from "Load models") also works. */
  models: ModelOption[];
  defaultModel: string;
  jsonMode: JsonMode;
  /** Effort values this model accepts, or null when the effort setting doesn't apply. */
  effortOptions: (model: string) => readonly string[] | null;
  extraHeaders?: Record<string, string>;
}

/** Everything a request needs: the provider plus the learner's resolved settings. */
export interface AIConfig {
  provider: ProviderDef;
  /** Display name; a custom provider can have its own. */
  providerName: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  /** undefined: don't send an effort setting. */
  effort: string | undefined;
  jsonMode: JsonMode;
}

export interface StructuredRequest<T> {
  system: string;
  messages: AIMessage[];
  schema: z.ZodType<T>;
  /** Multi-turn calls: let providers that support it cache the conversation prefix. */
  cache?: boolean;
}

export interface StreamRequest {
  /** Stable instructions. */
  system: string;
  /** Learner-specific context, sent after the instructions. */
  context: string;
  messages: AIMessage[];
  /** Called with the full reply text so far, each time more arrives. */
  onText: (text: string) => void;
  signal: AbortSignal;
}
