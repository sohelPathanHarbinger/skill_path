// Turns the learner's speech into text with the browser's built-in speech
// recognition: free and no key. Chrome sends the audio to Google and Edge to
// Microsoft to do this; Safari uses Apple's. Firefox doesn't offer it.
import { isPhoneOrTablet } from "../device";
import { features } from "../features";

// The Web Speech API isn't in TypeScript's DOM types, so these describe the parts used here.
interface RecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: { readonly transcript: string };
}
interface RecognitionResultEvent {
  readonly results: { readonly length: number; readonly [index: number]: RecognitionResult };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { readonly error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Whether the learner can speak instead of typing: voice is switched on and the browser can recognise speech. */
export function canListen(): boolean {
  return features.voiceSupport && recognitionConstructor() !== undefined;
}

/** How long to wait for the learner to start talking. */
const START_TIMEOUT_MS = 8000;
/** On computers, a pause this long after speech ends the message. */
const END_PAUSE_MS = 1800;

const PROBLEMS: Record<string, string> = {
  "not-allowed":
    "SkillPath can't use the microphone. Allow microphone access for this site (the icon in the address bar), then try again.",
  "service-not-allowed":
    "Speech recognition is turned off in this browser. Allow the microphone for this site; on an iPhone, iPad or Mac, also turn on Dictation in Settings.",
  "audio-capture": "No microphone was found. Connect one, or type instead.",
  network:
    "Speech recognition couldn't reach its online service. Check your internet connection. Some browsers, such as Brave, block it: try Chrome, Edge or Safari.",
  "language-not-supported": "Speech recognition doesn't support the language chosen in Voice settings. Pick another one.",
};
const UNEXPECTED = "Speech recognition stopped unexpectedly. Try again, or type instead.";

export interface ListenOptions {
  lang: string;
  /** Everything heard so far, including words that may still change. */
  onHeard: (text: string) => void;
  /** Called once at the end, with the words heard ("" for none) and a message if something went wrong. */
  onEnd: (text: string, problem: string | null) => void;
}

export interface Listening {
  /** Stops listening and delivers what was heard. */
  finish(): void;
  /** Stops listening and throws away what was heard. */
  cancel(): void;
}

const NOT_LISTENING: Listening = { finish() {}, cancel() {} };

export function startListening({ lang, onHeard, onEnd }: ListenOptions): Listening {
  const Recognition = recognitionConstructor();
  if (!Recognition) {
    queueMicrotask(() => onEnd("", "This browser can't recognise speech. Try Chrome, Edge or Safari, or type instead."));
    return NOT_LISTENING;
  }

  const recognition = new Recognition();
  // Computers listen until a pause of our choosing. Phones end at the first pause by
  // themselves, and their continuous mode repeats words.
  const continuous = !isPhoneOrTablet();
  recognition.lang = lang;
  recognition.continuous = continuous;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let heard = "";
  let problem: string | null = null;
  let cancelled = false;
  let timer = window.setTimeout(() => recognition.stop(), START_TIMEOUT_MS);

  recognition.onresult = (event) => {
    let text = "";
    for (let i = 0; i < event.results.length; i++) text += ` ${event.results[i][0].transcript}`;
    heard = text.replace(/\s+/g, " ").trim();
    onHeard(heard);
    window.clearTimeout(timer);
    if (continuous) timer = window.setTimeout(() => recognition.stop(), END_PAUSE_MS);
  };
  recognition.onerror = (event) => {
    // no-speech: nothing heard before the browser gave up; aborted: we cancelled.
    if (event.error === "no-speech" || event.error === "aborted") return;
    problem = PROBLEMS[event.error] ?? UNEXPECTED;
  };
  recognition.onend = () => {
    window.clearTimeout(timer);
    if (!cancelled) onEnd(heard, problem);
  };

  try {
    recognition.start();
  } catch {
    window.clearTimeout(timer);
    queueMicrotask(() => onEnd("", UNEXPECTED));
    return NOT_LISTENING;
  }

  return {
    finish: () => recognition.stop(),
    cancel: () => {
      cancelled = true;
      window.clearTimeout(timer);
      recognition.abort();
    },
  };
}
