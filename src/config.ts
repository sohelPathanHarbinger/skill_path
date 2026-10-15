// Default settings, read from .env.local when `npm run dev` / `npm run build` starts
// (restart the dev server after changing them; see .env.example).
// Anything chosen in the in-app Settings popup overrides these: see lib/settings.ts.
//
// API keys in .env.local are a convenience for `npm run dev` only and are left out of
// `npm run build`: anything inside a built app can be read by whoever opens it.
// Learners enter their own key in Settings, where it is kept encrypted on their
// device (lib/secrets.ts).
//
// Each variable is spelled out in full (import.meta.env.VITE_…): Vite replaces only
// those, while copying `import.meta.env` as a whole would put every variable,
// keys included, into the built app.

/** The AI used until the learner picks another one in Settings. */
export const ENV_PROVIDER: string = import.meta.env.VITE_AI_PROVIDER?.trim() || "gemini";

/** Model and effort for ENV_PROVIDER. Empty means that provider's recommended default. */
export const ENV_MODEL: string | undefined =
  (import.meta.env.VITE_AI_MODEL ?? (ENV_PROVIDER === "anthropic" ? import.meta.env.VITE_CLAUDE_MODEL : undefined))?.trim() ||
  undefined;
export const ENV_EFFORT: string | undefined =
  (import.meta.env.VITE_AI_EFFORT ?? (ENV_PROVIDER === "anthropic" ? import.meta.env.VITE_CLAUDE_EFFORT : undefined))
    ?.trim()
    .toLowerCase() || undefined;

/** Keys from .env.local, by provider id. Always empty in a production build. */
export const ENV_KEYS: Record<string, string | undefined> = import.meta.env.DEV
  ? {
      anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY,
      gemini: import.meta.env.VITE_GEMINI_API_KEY,
      groq: import.meta.env.VITE_GROQ_API_KEY,
      openrouter: import.meta.env.VITE_OPENROUTER_API_KEY,
      mistral: import.meta.env.VITE_MISTRAL_API_KEY,
      cerebras: import.meta.env.VITE_CEREBRAS_API_KEY,
      huggingface: import.meta.env.VITE_HUGGINGFACE_API_KEY,
      cohere: import.meta.env.VITE_COHERE_API_KEY,
      openai: import.meta.env.VITE_OPENAI_API_KEY,
      deepseek: import.meta.env.VITE_DEEPSEEK_API_KEY,
      xai: import.meta.env.VITE_XAI_API_KEY,
      custom: import.meta.env.VITE_CUSTOM_API_KEY,
    }
  : {};

export const ENV_CUSTOM_BASE_URL: string = import.meta.env.VITE_CUSTOM_BASE_URL?.trim() ?? "";
