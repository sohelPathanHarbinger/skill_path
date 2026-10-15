// The AI settings in use: choices saved from the Settings popup override the
// defaults from .env.local (config.ts). Saved choices live on this device only:
// provider, model and effort in localStorage, API keys encrypted in IndexedDB
// (secrets.ts). Call initSettings() once at startup to load the keys.
import { ENV_CUSTOM_BASE_URL, ENV_EFFORT, ENV_KEYS, ENV_MODEL, ENV_PROVIDER } from "../config";
import { CUSTOM_ID, findProvider, getProvider } from "./ai/providers";
import type { AIConfig, JsonMode } from "./ai/types";
import { loadApiKeys, saveApiKeys } from "./secrets";

/** What the learner saved for one provider. Empty fields fall back to the defaults. */
export interface ProviderOverrides {
  apiKey?: string;
  model?: string;
  effort?: string;
  baseUrl?: string;
}

export interface StoredSettings {
  provider?: string;
  providers: Record<string, ProviderOverrides>;
  customName?: string;
  customJsonMode?: JsonMode;
}

export interface Settings {
  config: AIConfig;
  /** Why requests can't be made yet (missing key, model or URL), or null when ready. */
  problem: string | null;
  stored: StoredSettings;
  /** False when this browser can't keep API keys between visits (e.g. some private windows). */
  keysSaved: boolean;
}

type ApiKeys = Record<string, string>;

const STORAGE_KEY = "skillpath.settings.v2";
const LEGACY_KEY = "skillpath.settings";
const JSON_MODES: JsonMode[] = ["json_schema", "json_object", "prompt"];
const listeners = new Set<() => void>();

export function defaultProviderId(): string {
  return findProvider(ENV_PROVIDER)?.id ?? "gemini";
}

/** Effort to use when the learner hasn't picked one. "low" keeps token use down. */
function defaultEffort(providerId: string, model: string): string | undefined {
  const options = getProvider(providerId).effortOptions(model);
  if (!options) return undefined;
  const preferred = providerId === defaultProviderId() ? ENV_EFFORT : undefined;
  if (preferred && options.includes(preferred)) return preferred;
  if (providerId === CUSTOM_ID) return undefined;
  return options.includes("low") ? "low" : undefined;
}

/** The values a provider uses when nothing is saved for it. */
export function providerDefaults(providerId: string): { apiKey: string; model: string; baseUrl: string } {
  const provider = getProvider(providerId);
  return {
    apiKey: ENV_KEYS[provider.id]?.trim() ?? "",
    model: (provider.id === defaultProviderId() && ENV_MODEL) || provider.defaultModel,
    baseUrl: provider.id === CUSTOM_ID ? ENV_CUSTOM_BASE_URL : provider.baseUrl,
  };
}

export function resolveConfig(
  providerId: string,
  overrides: ProviderOverrides,
  extras: Pick<StoredSettings, "customName" | "customJsonMode">,
): AIConfig {
  const provider = getProvider(providerId);
  const defaults = providerDefaults(provider.id);
  const model = overrides.model?.trim() || defaults.model;
  const options = provider.effortOptions(model);
  // An effort saved for one model may not apply to another.
  const effort = options
    ? overrides.effort && options.includes(overrides.effort)
      ? overrides.effort
      : defaultEffort(provider.id, model)
    : undefined;
  return {
    provider,
    providerName: provider.id === CUSTOM_ID && extras.customName ? extras.customName : provider.name,
    apiKey: overrides.apiKey?.trim() || defaults.apiKey,
    baseUrl: normalizeBaseUrl((provider.editableBaseUrl && overrides.baseUrl?.trim()) || defaults.baseUrl),
    model,
    effort,
    jsonMode: provider.id === CUSTOM_ID ? (extras.customJsonMode ?? provider.jsonMode) : provider.jsonMode,
  };
}

/** Makes a typed API URL usable: adds a missing http(s):// and drops trailing slashes. */
export function normalizeBaseUrl(raw: string): string {
  const url = raw.trim().replace(/\/+$/, "");
  if (!url) return "";
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(url)) return url;
  const localHost = /^(localhost|127\.|0\.0\.0\.0|\[::1\]|192\.168\.|10\.)/i.test(url);
  return `${localHost ? "http" : "https"}://${url}`;
}

function isWebAddress(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function setupProblem(config: AIConfig): string | null {
  if (!config.baseUrl) return `Enter the API URL for ${config.providerName} in Settings.`;
  if (!isWebAddress(config.baseUrl)) return `The API URL for ${config.providerName} isn't a valid web address: ${config.baseUrl}`;
  if (config.provider.keyRequired && !config.apiKey) return `Add your ${config.providerName} API key in Settings.`;
  if (!config.model) return `Choose a model for ${config.providerName} in Settings.`;
  return null;
}

function cleanOverrides(raw: unknown): ProviderOverrides {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
  return { apiKey: text(o.apiKey), model: text(o.model), effort: text(o.effort), baseUrl: text(o.baseUrl) };
}

function cleanStored(raw: unknown): StoredSettings {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const providers: Record<string, ProviderOverrides> = {};
  if (o.providers && typeof o.providers === "object") {
    for (const [id, value] of Object.entries(o.providers as Record<string, unknown>)) {
      if (!findProvider(id)) continue;
      const cleaned = cleanOverrides(value);
      if (Object.values(cleaned).some(Boolean)) providers[id] = cleaned;
    }
  }
  return {
    provider: typeof o.provider === "string" && findProvider(o.provider) ? o.provider : undefined,
    providers,
    customName: typeof o.customName === "string" && o.customName.trim() ? o.customName.trim() : undefined,
    customJsonMode: JSON_MODES.includes(o.customJsonMode as JsonMode) ? (o.customJsonMode as JsonMode) : undefined,
  };
}

/** What's saved in localStorage. Earlier versions kept API keys here in plain text. */
function readStored(): StoredSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return cleanStored(JSON.parse(saved));
    // Settings saved by the earlier Claude-only version.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return cleanStored({ providers: { anthropic: JSON.parse(legacy) } });
  } catch {
    // unreadable storage: use the defaults
  }
  return { providers: {} };
}

/** Saves everything except the API keys, which never go into localStorage. */
function writeStored(stored: StoredSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withKeys(stored, {})));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Storage unavailable: the settings still apply until the tab is closed.
  }
}

function keysOf(stored: StoredSettings): ApiKeys {
  const keys: ApiKeys = {};
  for (const [id, overrides] of Object.entries(stored.providers)) {
    if (overrides.apiKey) keys[id] = overrides.apiKey;
  }
  return keys;
}

/** The settings with exactly these API keys. */
function withKeys(stored: StoredSettings, keys: ApiKeys): StoredSettings {
  const providers: Record<string, ProviderOverrides> = {};
  for (const id of new Set([...Object.keys(stored.providers), ...Object.keys(keys)])) {
    providers[id] = { ...stored.providers[id], apiKey: keys[id] };
  }
  return cleanStored({ ...stored, providers });
}

let keysSaved = true;
let keyWrites: Promise<void> = Promise.resolve();

/** Encrypts and saves the keys, one write at a time so the latest change wins. */
function persistKeys(keys: ApiKeys): Promise<void> {
  keyWrites = keyWrites.then(async () => {
    if (!keysSaved) return;
    try {
      await saveApiKeys(keys);
    } catch {
      // Keys stay in memory for this session; Settings tells the learner.
      keysSaved = false;
      apply(current.stored);
    }
  });
  return keyWrites;
}

function resolve(stored: StoredSettings): Settings {
  const providerId = stored.provider ?? defaultProviderId();
  const config = resolveConfig(providerId, stored.providers[providerId] ?? {}, stored);
  return { config, problem: setupProblem(config), stored, keysSaved };
}

let current = resolve(readStored());

function apply(stored: StoredSettings): void {
  current = resolve(stored);
  listeners.forEach((listener) => listener());
}

/**
 * Loads the encrypted API keys. Call once at startup, before the first AI request.
 * Keys that an earlier version saved in plain text are encrypted, then removed from
 * localStorage.
 */
export async function initSettings(): Promise<void> {
  const stored = readStored();
  const plainKeys = keysOf(stored);
  let savedKeys: ApiKeys = {};
  try {
    savedKeys = await loadApiKeys();
  } catch {
    keysSaved = false;
  }
  const keys = { ...plainKeys, ...savedKeys };
  apply(withKeys(stored, keys));
  if (keysSaved && Object.keys(plainKeys).length > 0) {
    await persistKeys(keys);
    if (keysSaved) writeStored(stored);
  }
}

export function getSettings(): Settings {
  return current;
}

export function saveSettings(stored: StoredSettings): void {
  const cleaned = cleanStored(stored);
  writeStored(cleaned);
  apply(cleaned);
  void persistKeys(keysOf(cleaned));
}

/** Saves one change on top of the current settings (used by the quick AI switcher). */
export function updateSettings(mutate: (stored: StoredSettings) => StoredSettings): void {
  saveSettings(mutate(current.stored));
}

/** Forgets every saved choice and API key. */
export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // nothing stored
  }
  apply({ providers: {} });
  void persistKeys({});
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
