// Default settings, read from .env.local when `npm run dev` / `npm run build` starts
// (restart the dev server after changing them; see .env.example).
// Anything chosen in the in-app Settings popup overrides these: see lib/settings.ts.
//
// Keys in .env.local are baked into the JavaScript bundle at build time, and keys
// entered in Settings are kept in this browser's localStorage. Either way anyone
// with access to the running app could read them, so keep this to local use.
// Before sharing the app, move the AI calls behind a small server function.

const env = import.meta.env;

/** The AI used until the learner picks another one in Settings. */
export const ENV_PROVIDER: string = env.VITE_AI_PROVIDER?.trim() || "anthropic";

/** Model and effort for ENV_PROVIDER. Empty means that provider's recommended default. */
export const ENV_MODEL: string | undefined =
  (env.VITE_AI_MODEL ?? (ENV_PROVIDER === "anthropic" ? env.VITE_CLAUDE_MODEL : undefined))?.trim() || undefined;
export const ENV_EFFORT: string | undefined =
  (env.VITE_AI_EFFORT ?? (ENV_PROVIDER === "anthropic" ? env.VITE_CLAUDE_EFFORT : undefined))?.trim().toLowerCase() ||
  undefined;

// Vite only exposes variables that are spelled out in full, so each key is listed here.
export const ENV_KEYS: Record<string, string | undefined> = {
  anthropic: env.VITE_ANTHROPIC_API_KEY,
  gemini: env.VITE_GEMINI_API_KEY,
  groq: env.VITE_GROQ_API_KEY,
  openrouter: env.VITE_OPENROUTER_API_KEY,
  mistral: env.VITE_MISTRAL_API_KEY,
  cerebras: env.VITE_CEREBRAS_API_KEY,
  huggingface: env.VITE_HUGGINGFACE_API_KEY,
  cohere: env.VITE_COHERE_API_KEY,
  openai: env.VITE_OPENAI_API_KEY,
  deepseek: env.VITE_DEEPSEEK_API_KEY,
  xai: env.VITE_XAI_API_KEY,
  custom: env.VITE_CUSTOM_API_KEY,
};

export const ENV_CUSTOM_BASE_URL: string = env.VITE_CUSTOM_BASE_URL?.trim() ?? "";
