// The learner's voice choices. Saved in localStorage on this device; changes
// take effect straight away.

export interface VoicePrefs {
  /** Read every tutor reply aloud. Replies to spoken messages are read aloud either way. */
  readAloud: boolean;
  /** After a reply has been read aloud, listen for the learner's answer without a tap. */
  handsFree: boolean;
  /** voiceURI of the chosen voice; "" picks the best one for the language. */
  voice: string;
  /** Speaking speed; 1 is normal. */
  rate: number;
  /** Language to listen and speak in, such as en-IN; "" uses the browser's language. */
  lang: string;
}

export const RATES = [0.8, 0.9, 1, 1.1, 1.25, 1.5];

export const LANGUAGES = [
  { id: "en-US", label: "English (US)" },
  { id: "en-GB", label: "English (UK)" },
  { id: "en-IN", label: "English (India)" },
  { id: "en-AU", label: "English (Australia)" },
  { id: "hi-IN", label: "Hindi (India)" },
];

const STORAGE_KEY = "skillpath.voice.v1";
const DEFAULTS: VoicePrefs = { readAloud: false, handsFree: false, voice: "", rate: 1, lang: "" };
const listeners = new Set<() => void>();

function clean(raw: unknown): VoicePrefs {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    readAloud: typeof o.readAloud === "boolean" ? o.readAloud : DEFAULTS.readAloud,
    handsFree: typeof o.handsFree === "boolean" ? o.handsFree : DEFAULTS.handsFree,
    voice: typeof o.voice === "string" ? o.voice : DEFAULTS.voice,
    rate: typeof o.rate === "number" && o.rate >= 0.5 && o.rate <= 2 ? o.rate : DEFAULTS.rate,
    lang: typeof o.lang === "string" ? o.lang : DEFAULTS.lang,
  };
}

function read(): VoicePrefs {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return clean(JSON.parse(saved));
  } catch {
    // unreadable storage: use the defaults
  }
  return { ...DEFAULTS };
}

let current = read();

export function getVoicePrefs(): VoicePrefs {
  return current;
}

export function updateVoicePrefs(patch: Partial<VoicePrefs>): void {
  current = clean({ ...current, ...patch });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage unavailable: the choice still applies until the tab is closed.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeVoicePrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The language to listen and speak in. */
export function speechLang(): string {
  return current.lang || navigator.language || "en-US";
}
