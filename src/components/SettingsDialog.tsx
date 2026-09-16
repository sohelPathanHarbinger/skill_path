import { useEffect, useState, type FormEvent } from "react";
import { useSettings } from "../hooks/useSettings";
import { listModels } from "../lib/ai";
import { CUSTOM_ID, getProvider, GROUP_LABEL, GROUP_ORDER, PROVIDERS } from "../lib/ai/providers";
import type { JsonMode } from "../lib/ai/types";
import { describeError } from "../lib/learning";
import {
  clearSettings,
  defaultProviderId,
  providerDefaults,
  resolveConfig,
  saveSettings,
  type ProviderOverrides,
} from "../lib/settings";
import { Button } from "./ui";

const JSON_MODE_LABEL: Record<JsonMode, string> = {
  json_schema: "JSON schema (most reliable, if the service supports it)",
  json_object: "JSON mode",
  prompt: "Instructions only (works with any model)",
};

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400";
const label = "block text-sm font-medium text-slate-700";

/**
 * Choose the AI provider, API key, model and effort. Saved values override the
 * .env.local defaults; empty fields, or closing without saving, keep the defaults.
 */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { config: active, stored } = useSettings();
  const [providerId, setProviderId] = useState(active.provider.id);
  const [drafts, setDrafts] = useState<Record<string, ProviderOverrides>>(() => ({ ...stored.providers }));
  const [customName, setCustomName] = useState(stored.customName ?? "");
  const [customJsonMode, setCustomJsonMode] = useState<JsonMode>(
    stored.customJsonMode ?? getProvider(CUSTOM_ID).jsonMode,
  );
  const [showKey, setShowKey] = useState(false);
  const [loadedModels, setLoadedModels] = useState<Record<string, string[]>>({});
  const [loadStatus, setLoadStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const provider = getProvider(providerId);
  const draft = drafts[providerId] ?? {};
  const defaults = providerDefaults(providerId);
  const extras = { customName: customName.trim() || undefined, customJsonMode };
  const preview = resolveConfig(providerId, draft, extras);
  const effortOptions = provider.effortOptions(preview.model);
  const defaultEffort = resolveConfig(providerId, { ...draft, effort: undefined }, extras).effort;
  const suggested = provider.models.map((m) => m.id);
  const modelIds = [...suggested, ...(loadedModels[providerId] ?? []).filter((id) => !suggested.includes(id))];
  const hasSaved = Boolean(stored.provider) || Object.keys(stored.providers).length > 0;

  function update(patch: Partial<ProviderOverrides>) {
    setDrafts((prev) => ({ ...prev, [providerId]: { ...prev[providerId], ...patch } }));
  }

  function chooseProvider(id: string) {
    setProviderId(id);
    setShowKey(false);
    setLoadStatus(null);
  }

  async function loadModels() {
    if (provider.keyRequired && !preview.apiKey) {
      setLoadStatus("Enter an API key first.");
      return;
    }
    if (!preview.baseUrl) {
      setLoadStatus("Enter the API URL first.");
      return;
    }
    setLoading(true);
    setLoadStatus(null);
    try {
      const ids = await listModels(preview);
      setLoadedModels((prev) => ({ ...prev, [providerId]: ids }));
      setLoadStatus(ids.length ? `Loaded ${ids.length} models: pick one from the Model list.` : "The service returned no models.");
    } catch (err) {
      setLoadStatus(describeError(err));
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    saveSettings({ provider: providerId, providers: drafts, ...extras });
    onClose();
  }

  function reset() {
    clearSettings();
    setProviderId(defaultProviderId());
    setDrafts({});
    setCustomName("");
    setCustomJsonMode(getProvider(CUSTOM_ID).jsonMode);
    setLoadStatus(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto my-8 w-full max-w-xl space-y-5 rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="settings-title" className="text-lg font-semibold">
              AI settings
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose which AI teaches you. Leave a field empty to use its default. Closing this window keeps your
              current settings.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Provider */}
        <div className="space-y-2">
          <label htmlFor="settings-provider" className={label}>
            AI provider
          </label>
          <select
            id="settings-provider"
            value={providerId}
            onChange={(e) => chooseProvider(e.target.value)}
            className={field}
          >
            {GROUP_ORDER.map((group) => {
              const items = PROVIDERS.filter((p) => p.group === group);
              return (
                <optgroup key={group} label={GROUP_LABEL[group]}>
                  {items.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.id === defaultProviderId() ? " (default)" : ""}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <div className="space-y-1.5 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
            <p>
              <span className="font-medium text-slate-800">{provider.group === "free" ? "Free option: " : "Pricing: "}</span>
              {provider.pricing}
            </p>
            {provider.notes && <p>{provider.notes}</p>}
            {provider.keyUrl && (
              <p>
                <a href={provider.keyUrl} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 underline">
                  {provider.keyRequired ? "Get an API key ↗" : "Download ↗"}
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Custom provider name and JSON mode */}
        {provider.id === CUSTOM_ID && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="settings-custom-name" className={label}>
                Display name
              </label>
              <input
                id="settings-custom-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Company AI gateway"
                className={field}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="settings-json-mode" className={label}>
                Structured replies
              </label>
              <select
                id="settings-json-mode"
                value={customJsonMode}
                onChange={(e) => setCustomJsonMode(e.target.value as JsonMode)}
                className={field}
              >
                {(Object.keys(JSON_MODE_LABEL) as JsonMode[]).map((mode) => (
                  <option key={mode} value={mode}>
                    {JSON_MODE_LABEL[mode]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Base URL (custom endpoints) */}
        {provider.editableBaseUrl && (
          <div className="space-y-2">
            <label htmlFor="settings-url" className={label}>
              API URL
            </label>
            <input
              id="settings-url"
              value={draft.baseUrl ?? ""}
              onChange={(e) => update({ baseUrl: e.target.value })}
              placeholder={defaults.baseUrl ? `Default: ${defaults.baseUrl}` : "https://your-service.example.com/v1"}
              spellCheck={false}
              className={`${field} font-mono`}
            />
          </div>
        )}

        {/* API key */}
        <div className="space-y-2">
          <label htmlFor="settings-key" className={label}>
            API key{provider.keyRequired ? "" : " (optional)"}
          </label>
          <div className="flex gap-2">
            <input
              id="settings-key"
              type={showKey ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              value={draft.apiKey ?? ""}
              onChange={(e) => update({ apiKey: e.target.value })}
              placeholder={
                defaults.apiKey
                  ? `Default: key from .env.local (…${defaults.apiKey.slice(-4)})`
                  : (provider.keyPlaceholder ?? (provider.keyRequired ? "Paste your key" : "Only if the service needs one"))
              }
              className={`${field} min-w-0 font-mono`}
            />
            <Button variant="secondary" onClick={() => setShowKey((v) => !v)} className="shrink-0">
              {showKey ? "Hide" : "Show"}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Saved only in this browser and sent only to {provider.name}.
          </p>
        </div>

        {/* Model */}
        <div className="space-y-2">
          <label htmlFor="settings-model" className={label}>
            Model
          </label>
          <div className="flex gap-2">
            <input
              id="settings-model"
              list="settings-model-options"
              value={draft.model ?? ""}
              onChange={(e) => update({ model: e.target.value })}
              placeholder={defaults.model ? `Default: ${defaults.model}` : "Type a model id or click Load models"}
              spellCheck={false}
              className={`${field} min-w-0 font-mono`}
            />
            <Button variant="secondary" onClick={loadModels} disabled={loading} className="shrink-0">
              {loading ? "Loading…" : "Load models"}
            </Button>
          </div>
          <datalist id="settings-model-options">
            {modelIds.map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>
          {provider.models.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {provider.models.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => update({ model: m.id })}
                  className={`rounded-full px-3 py-1 text-xs ring-1 transition ${
                    preview.model === m.id
                      ? "bg-indigo-600 text-white ring-indigo-600"
                      : "bg-white text-slate-600 ring-slate-200 hover:ring-indigo-300"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
          {loadStatus && <p className="text-xs text-slate-600">{loadStatus}</p>}
        </div>

        {/* Effort */}
        <div className="space-y-2">
          <label htmlFor="settings-effort" className={label}>
            Effort
          </label>
          <select
            id="settings-effort"
            value={effortOptions && draft.effort && effortOptions.includes(draft.effort) ? draft.effort : ""}
            onChange={(e) => update({ effort: e.target.value || undefined })}
            disabled={!effortOptions}
            className={field}
          >
            <option value="">Default ({defaultEffort ?? "not sent"})</option>
            {(effortOptions ?? []).map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            {effortOptions
              ? "How much the model thinks before answering. Lower effort uses fewer tokens."
              : "This model doesn't have an effort setting."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <Button type="submit">Save</Button>
          <Button variant="secondary" onClick={onClose}>
            {hasSaved ? "Close" : "Use defaults"}
          </Button>
          {hasSaved && (
            <Button variant="ghost" onClick={reset} className="ml-auto">
              Reset to defaults
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
