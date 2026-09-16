// The AI services SkillPath can use. Facts checked in September 2026; free tiers
// and model names change often, so every model field also accepts any id, and
// Settings can load a provider's live model list.
import type { ProviderDef } from "./types";

const CLAUDE_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
const OPENAI_REASONING = ["none", "low", "medium", "high", "xhigh"] as const;
const LOW_MEDIUM_HIGH = ["low", "medium", "high"] as const;
const GEMINI_THINKING = ["minimal", "low", "medium", "high"] as const;

/** Claude models with adaptive thinking + effort. Haiku 4.5 and older models take neither. */
function claudeEfforts(model: string) {
  return /^claude-(fable|mythos|opus-5|opus-4-[678]|sonnet-5|sonnet-4-6)/.test(model) ? CLAUDE_EFFORTS : null;
}

/** OpenAI's open-weight gpt-oss models, served by several providers. */
function gptOssEfforts(model: string) {
  return /gpt-oss/.test(model) ? LOW_MEDIUM_HIGH : null;
}

function grokEfforts(model: string) {
  if (/^grok-4\.3/.test(model)) return ["none", "low", "medium", "high"] as const;
  if (/^grok-(4\.[6-9]|[5-9])/.test(model)) return ["low", "medium", "high", "xhigh"] as const;
  if (/^grok-4/.test(model)) return LOW_MEDIUM_HIGH;
  return null;
}

const noEffort = () => null;

export const CUSTOM_ID = "custom";

export const GROUP_ORDER: ProviderDef["group"][] = ["default", "free", "paid", "custom"];

export const GROUP_LABEL: Record<ProviderDef["group"], string> = {
  default: "Default",
  free: "Free tier or free credits",
  paid: "Paid",
  custom: "Custom",
};

export const PROVIDERS: ProviderDef[] = [
  {
    id: "anthropic",
    name: "Anthropic Claude",
    kind: "anthropic",
    group: "default",
    baseUrl: "https://api.anthropic.com",
    editableBaseUrl: false,
    keyRequired: true,
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyPlaceholder: "sk-ant-…",
    pricing:
      "Paid, no free tier. Per million input / output tokens: Haiku 4.5 $1 / $5, Sonnet 5 $2 / $10, Opus 5 $5 / $25.",
    models: [
      { id: "claude-sonnet-5", label: "Claude Sonnet 5 · balanced" },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 · cheapest" },
      { id: "claude-opus-5", label: "Claude Opus 5 · best quality" },
    ],
    defaultModel: "claude-sonnet-5",
    jsonMode: "json_schema",
    effortOptions: claudeEfforts,
  },

  // --- Free tiers and free credits ---------------------------------------
  {
    id: "gemini",
    name: "Google Gemini",
    kind: "openai-compatible",
    group: "free",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    editableBaseUrl: false,
    keyRequired: true,
    keyUrl: "https://aistudio.google.com/apikey",
    keyPlaceholder: "AIza…",
    pricing: "Free tier, no credit card (rate-limited). Google may use free-tier prompts to improve its products.",
    models: [
      { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash · smartest Flash" },
      { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite · fastest" },
    ],
    defaultModel: "gemini-3.8-flash",
    jsonMode: "json_schema",
    effortOptions: (model) => (/^gemini-(2\.5|3)/.test(model) ? GEMINI_THINKING : null),
  },
  {
    id: "groq",
    name: "Groq",
    kind: "openai-compatible",
    group: "free",
    baseUrl: "https://api.groq.com/openai/v1",
    editableBaseUrl: false,
    keyRequired: true,
    keyUrl: "https://console.groq.com/keys",
    keyPlaceholder: "gsk_…",
    pricing: "Free tier, no credit card (about 30 requests a minute). Very fast open models.",
    models: [
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B · strongest" },
      { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B · fastest" },
    ],
    defaultModel: "openai/gpt-oss-120b",
    jsonMode: "json_schema",
    effortOptions: gptOssEfforts,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    kind: "openai-compatible",
    group: "free",
    baseUrl: "https://openrouter.ai/api/v1",
    editableBaseUrl: false,
    keyRequired: true,
    keyUrl: "https://openrouter.ai/settings/keys",
    keyPlaceholder: "sk-or-…",
    pricing:
      "Free models (ids ending in :free), no credit card, about 50 requests a day. Free hosts may log prompts. Also sells access to most other models.",
    notes: "\"openrouter/free\" picks an available free model for each request. Use Load models to choose a specific one.",
    models: [{ id: "openrouter/free", label: "Any free model (auto)" }],
    defaultModel: "openrouter/free",
    jsonMode: "json_object",
    effortOptions: noEffort,
    extraHeaders: { "X-Title": "SkillPath" },
  },
  {
    id: "mistral",
    name: "Mistral AI",
    kind: "openai-compatible",
    group: "free",
    baseUrl: "https://api.mistral.ai/v1",
    editableBaseUrl: false,
    keyRequired: true,
    keyUrl: "https://console.mistral.ai/api-keys",
    pricing:
      "Free Experiment plan (phone verification, rate-limited). It requires letting Mistral train on your data.",
    models: [
      { id: "mistral-small-latest", label: "Mistral Small · fast" },
      { id: "mistral-medium-latest", label: "Mistral Medium · balanced" },
      { id: "mistral-large-latest", label: "Mistral Large · strongest" },
    ],
    defaultModel: "mistral-small-latest",
    jsonMode: "json_schema",
    effortOptions: noEffort,
  },
  {
    id: "cerebras",
    name: "Cerebras",
    kind: "openai-compatible",
    group: "free",
    baseUrl: "https://api.cerebras.ai/v1",
    editableBaseUrl: false,
    keyRequired: true,
    keyUrl: "https://cloud.cerebras.ai",
    keyPlaceholder: "csk-…",
    pricing: "Free trial tier (rate-limited, shorter context). Extremely fast.",
    models: [
      { id: "gpt-oss-120b", label: "GPT-OSS 120B" },
      { id: "qwen-3.8-27b", label: "Qwen 3.8 27B" },
    ],
    defaultModel: "gpt-oss-120b",
    jsonMode: "json_schema",
    effortOptions: gptOssEfforts,
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    kind: "openai-compatible",
    group: "free",
    baseUrl: "https://router.huggingface.co/v1",
    editableBaseUrl: false,
    keyRequired: true,
    keyUrl: "https://huggingface.co/settings/tokens",
    keyPlaceholder: "hf_…",
    pricing: "Free accounts get a small monthly credit. Routes to many open models across providers.",
    notes:
      "Create a fine-grained token with the \"Make calls to Inference Providers\" permission. Add :fastest or :cheapest to a model id to choose how it's routed.",
    models: [{ id: "openai/gpt-oss-120b:fastest", label: "GPT-OSS 120B · fastest route" }],
    defaultModel: "openai/gpt-oss-120b:fastest",
    jsonMode: "json_object",
    effortOptions: gptOssEfforts,
  },
  {
    id: "cohere",
    name: "Cohere",
    kind: "openai-compatible",
    group: "free",
    baseUrl: "https://api.cohere.ai/compatibility/v1",
    editableBaseUrl: false,
    keyRequired: true,
    keyUrl: "https://dashboard.cohere.com/api-keys",
    pricing: "Free trial keys (rate-limited, not for production use).",
    models: [{ id: "command-a-03-2025", label: "Command A" }],
    defaultModel: "command-a-03-2025",
    jsonMode: "json_schema",
    effortOptions: noEffort,
  },

  // --- Paid ---------------------------------------------------------------
  {
    id: "openai",
    name: "OpenAI",
    kind: "openai-compatible",
    group: "paid",
    baseUrl: "https://api.openai.com/v1",
    editableBaseUrl: false,
    keyRequired: true,
    keyUrl: "https://platform.openai.com/api-keys",
    keyPlaceholder: "sk-…",
    pricing: "Paid, no free tier. GPT-5.4 mini is the lower-cost option.",
    models: [
      { id: "gpt-5.4-mini", label: "GPT-5.4 mini · lower cost" },
      { id: "gpt-5.5", label: "GPT-5.5 · flagship" },
    ],
    defaultModel: "gpt-5.4-mini",
    jsonMode: "json_schema",
    effortOptions: (model) => (/^gpt-5/.test(model) ? OPENAI_REASONING : /^o\d/.test(model) ? LOW_MEDIUM_HIGH : null),
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    kind: "openai-compatible",
    group: "paid",
    baseUrl: "https://api.deepseek.com",
    editableBaseUrl: false,
    keyRequired: true,
    keyUrl: "https://platform.deepseek.com/api_keys",
    keyPlaceholder: "sk-…",
    pricing: "Paid, among the lowest prices. Top up a small balance to start.",
    models: [
      { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash · cheapest" },
      { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro · strongest" },
    ],
    defaultModel: "deepseek-v4-flash",
    jsonMode: "json_object",
    effortOptions: noEffort,
  },
  {
    id: "xai",
    name: "xAI Grok",
    kind: "openai-compatible",
    group: "paid",
    baseUrl: "https://api.x.ai/v1",
    editableBaseUrl: false,
    keyRequired: true,
    keyUrl: "https://console.x.ai",
    keyPlaceholder: "xai-…",
    pricing: "Paid. Check the xAI console for any promotional credits on your account.",
    models: [
      { id: "grok-4.3", label: "Grok 4.3 · lower cost" },
      { id: "grok-4.6", label: "Grok 4.6 · flagship" },
    ],
    defaultModel: "grok-4.3",
    jsonMode: "json_schema",
    effortOptions: grokEfforts,
  },

  // --- Custom ---------------------------------------------------------------
  {
    id: CUSTOM_ID,
    name: "Custom (OpenAI-compatible)",
    kind: "openai-compatible",
    group: "custom",
    baseUrl: "",
    editableBaseUrl: true,
    keyRequired: false,
    pricing:
      "Any service with an OpenAI-compatible /chat/completions API: a company AI gateway, or a provider not listed here.",
    notes:
      "Enter the base URL (the part before /chat/completions), a model id and a key if the service needs one. The service must allow requests from browsers (CORS).",
    models: [],
    defaultModel: "",
    jsonMode: "json_object",
    effortOptions: () => LOW_MEDIUM_HIGH,
  },
];

export function findProvider(id: string | undefined): ProviderDef | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function getProvider(id: string): ProviderDef {
  return findProvider(id) ?? PROVIDERS[0];
}
