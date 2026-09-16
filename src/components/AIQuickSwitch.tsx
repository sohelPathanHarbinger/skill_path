import { useEffect, useId, useState } from "react";
import { useSettings } from "../hooks/useSettings";
import { openSettingsDialog } from "../hooks/useSettingsDialog";
import { listModels } from "../lib/ai";
import { GROUP_LABEL, GROUP_ORDER, PROVIDERS } from "../lib/ai/providers";
import { describeError } from "../lib/learning";
import { getSettings, updateSettings, type ProviderOverrides } from "../lib/settings";
import { Button } from "./ui";

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
const label = "block text-xs font-medium text-slate-600";

/**
 * Pick the AI provider and model, and add a missing key or URL, without leaving
 * the page. Changes are saved straight away, exactly like the Settings popup.
 */
export function AIQuickSwitch({ autoLoadModels = false }: { autoLoadModels?: boolean }) {
  const { config, problem, stored } = useSettings();
  const provider = config.provider;
  const savedUrl = stored.providers[provider.id]?.baseUrl ?? "";
  const ids = { provider: useId(), model: useId(), models: useId(), key: useId(), url: useId() };
  const [model, setModel] = useState(config.model);
  const [baseUrl, setBaseUrl] = useState(savedUrl);
  const [apiKey, setApiKey] = useState("");
  const [loadedModels, setLoadedModels] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => setModel(config.model), [config.model]);
  useEffect(() => setBaseUrl(savedUrl), [savedUrl]);

  const needsKey = provider.keyRequired && !config.apiKey;
  const loaded = loadedModels[provider.id];
  const suggested = provider.models.map((m) => m.id);
  const allModels = [...suggested, ...(loaded ?? []).filter((id) => !suggested.includes(id))];
  // Local servers: show what's actually installed. Others: the suggestions, plus a short loaded list.
  const chips =
    provider.group === "local" && loaded
      ? loaded.map((id) => ({ id, label: id }))
      : [
          ...provider.models,
          ...(loaded && loaded.length <= 12 ? loaded.filter((id) => !suggested.includes(id)).map((id) => ({ id, label: id })) : []),
        ];

  async function loadModels() {
    setLoading(true);
    setStatus(null);
    const current = getSettings().config;
    try {
      const found = await listModels(current);
      setLoadedModels((prev) => ({ ...prev, [current.provider.id]: found }));
      if (!found.length) {
        setStatus(
          `${current.providerName} has no models yet.${current.provider.id === "ollama" ? ' Download one first, e.g. "ollama pull llama3.1".' : ""}`,
        );
      }
    } catch (err) {
      setStatus(describeError(err));
    } finally {
      setLoading(false);
    }
  }

  // Local servers list their installed models for free; after a "model not found" error, list them for any provider.
  const autoLoad = (autoLoadModels || provider.group === "local") && !needsKey && Boolean(config.baseUrl);
  useEffect(() => {
    if (autoLoad && !loadedModels[provider.id]) void loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.id, autoLoad]);

  function saveForProvider(patch: Partial<ProviderOverrides>) {
    updateSettings((s) => ({
      ...s,
      provider: provider.id,
      providers: { ...s.providers, [provider.id]: { ...s.providers[provider.id], ...patch } },
    }));
  }

  function chooseProvider(id: string) {
    setStatus(null);
    updateSettings((s) => ({ ...s, provider: id }));
  }

  function commitModel(value: string) {
    const next = value.trim();
    if (next && next !== config.model) saveForProvider({ model: next });
    else setModel(config.model);
  }

  function commitUrl(value: string) {
    const next = value.trim();
    if (next === savedUrl) return;
    saveForProvider({ baseUrl: next || undefined });
    setLoadedModels((prev) => ({ ...prev, [provider.id]: [] }));
    if (provider.group === "local") void loadModels();
  }

  function saveKey() {
    if (!apiKey.trim()) return;
    saveForProvider({ apiKey: apiKey.trim() });
    setApiKey("");
  }

  const onEnter = (commit: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={ids.provider} className={label}>
            AI provider
          </label>
          <select id={ids.provider} value={provider.id} onChange={(e) => chooseProvider(e.target.value)} className={field}>
            {GROUP_ORDER.map((group) => (
              <optgroup key={group} label={GROUP_LABEL[group]}>
                {PROVIDERS.filter((p) => p.group === group).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={ids.model} className={label}>
            Model
          </label>
          <div className="flex gap-2">
            <input
              id={ids.model}
              list={ids.models}
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                if (allModels.includes(e.target.value)) commitModel(e.target.value);
              }}
              onBlur={(e) => commitModel(e.target.value)}
              onKeyDown={onEnter(() => commitModel(model))}
              placeholder="Model id"
              spellCheck={false}
              className={`${field} min-w-0 font-mono`}
            />
            <Button variant="secondary" onClick={loadModels} disabled={loading || needsKey} className="shrink-0 px-3">
              {loading ? "Loading…" : "Load models"}
            </Button>
          </div>
          <datalist id={ids.models}>
            {allModels.map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => commitModel(chip.id)}
              className={`rounded-full px-3 py-1 text-xs ring-1 transition ${
                config.model === chip.id
                  ? "bg-indigo-600 text-white ring-indigo-600"
                  : "bg-white text-slate-600 ring-slate-200 hover:ring-indigo-300"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {provider.editableBaseUrl && (
        <div className="space-y-1.5">
          <label htmlFor={ids.url} className={label}>
            API URL
          </label>
          <input
            id={ids.url}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            onBlur={(e) => commitUrl(e.target.value)}
            onKeyDown={onEnter(() => commitUrl(baseUrl))}
            placeholder={provider.baseUrl ? `Default: ${provider.baseUrl}` : "https://your-service.example.com/v1"}
            spellCheck={false}
            className={`${field} font-mono`}
          />
          {config.baseUrl && <p className="text-xs text-slate-500">Requests go to {config.baseUrl}</p>}
        </div>
      )}

      {needsKey && (
        <div className="space-y-1.5">
          <label htmlFor={ids.key} className={label}>
            {config.providerName} API key
          </label>
          <div className="flex gap-2">
            <input
              id={ids.key}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={onEnter(saveKey)}
              placeholder={provider.keyPlaceholder ?? "Paste your key"}
              className={`${field} min-w-0 font-mono`}
            />
            <Button onClick={saveKey} disabled={!apiKey.trim()} className="shrink-0">
              Save key
            </Button>
          </div>
          {provider.keyUrl && (
            <a href={provider.keyUrl} target="_blank" rel="noreferrer" className="inline-block text-xs font-medium text-indigo-600 underline">
              Get a {provider.name} key ↗
            </a>
          )}
        </div>
      )}

      {provider.group === "local" && provider.notes && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
          <span className="font-medium text-slate-800">Setup: </span>
          {provider.notes}{" "}
          {provider.keyUrl && (
            <a href={provider.keyUrl} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 underline">
              Download {provider.name} ↗
            </a>
          )}
        </p>
      )}

      {status && <p className="text-xs text-rose-700">{status}</p>}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-xs">
        <span className={`min-w-0 flex-1 ${problem ? "text-amber-700" : "text-slate-500"}`}>{problem ?? provider.pricing}</span>
        <button type="button" onClick={openSettingsDialog} className="shrink-0 font-medium text-indigo-600 hover:underline">
          More settings
        </button>
      </div>
    </div>
  );
}
