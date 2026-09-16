/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_PROVIDER?: string;
  readonly VITE_AI_MODEL?: string;
  readonly VITE_AI_EFFORT?: string;
  /** Older names, still read when the provider is anthropic. */
  readonly VITE_CLAUDE_MODEL?: string;
  readonly VITE_CLAUDE_EFFORT?: string;

  readonly VITE_ANTHROPIC_API_KEY?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GROQ_API_KEY?: string;
  readonly VITE_OPENROUTER_API_KEY?: string;
  readonly VITE_MISTRAL_API_KEY?: string;
  readonly VITE_CEREBRAS_API_KEY?: string;
  readonly VITE_HUGGINGFACE_API_KEY?: string;
  readonly VITE_COHERE_API_KEY?: string;
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_DEEPSEEK_API_KEY?: string;
  readonly VITE_XAI_API_KEY?: string;

  readonly VITE_CUSTOM_BASE_URL?: string;
  readonly VITE_CUSTOM_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
