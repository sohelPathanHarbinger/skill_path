// Reads text aloud with the browser's built-in voices: free, no key, and it works
// with any AI. One thing is read at a time; starting another stops the current one.
import { features } from "../features";
import { getVoicePrefs, speechLang } from "./prefs";
import { toSpeechPieces } from "./speechText";

const synth: SpeechSynthesis | null =
  typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;

/** Whether replies can be read aloud: voice is switched on and the browser has voices. */
export function canSpeak(): boolean {
  return features.voiceSupport && synth !== null;
}

/** The browser's voices. Some browsers return none until they've loaded them (see onVoicesChanged). */
export function listVoices(): SpeechSynthesisVoice[] {
  return synth?.getVoices() ?? [];
}

export function onVoicesChanged(listener: () => void): () => void {
  if (!synth) return () => {};
  synth.addEventListener("voiceschanged", listener);
  return () => synth.removeEventListener("voiceschanged", listener);
}

const voiceLang = (voice: SpeechSynthesisVoice) => voice.lang.replace("_", "-").toLowerCase();

/** The most natural-sounding voice for a language, or undefined if none speaks it. */
export function bestVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
  const wanted = lang.toLowerCase();
  const base = wanted.split("-")[0];
  let best: SpeechSynthesisVoice | undefined;
  let bestScore = 0;
  for (const voice of voices) {
    const vl = voiceLang(voice);
    let score = vl === wanted ? 4 : vl.split("-")[0] === base ? 2 : 0;
    if (score === 0) continue;
    if (/natural|neural/i.test(voice.name)) score += 3; // Edge's online voices
    else if (/google|premium|enhanced|siri/i.test(voice.name)) score += 2; // Chrome's, Apple's better ones
    if (voice.default) score += 1;
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

/** The voice picked in Voice settings, or the best one for the language. */
function chosenVoice(): SpeechSynthesisVoice | undefined {
  const voices = listVoices();
  const picked = getVoicePrefs().voice;
  return (picked && voices.find((v) => v.voiceURI === picked)) || bestVoice(voices, speechLang());
}

let current: Reading | null = null;
const listeners = new Set<() => void>();

function setCurrent(reading: Reading | null): void {
  current = reading;
  listeners.forEach((listener) => listener());
}

/** The key of what is being read aloud, or null. */
export function speakingKey(): string | null {
  return current?.key ?? null;
}

export function subscribeSpeaking(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * One text being read aloud. Give it the text so far as a reply streams in: each
 * sentence is read as soon as the next one starts, so speech begins within a moment.
 */
export class Reading {
  private said = 0;
  private unfinished = 0;
  private complete = false;
  private stopped = false;
  // Held until each one ends: Chrome drops the end event of an utterance that gets garbage-collected.
  private utterances = new Set<SpeechSynthesisUtterance>();

  constructor(
    readonly key: string,
    private onFinish?: () => void,
  ) {}

  /** The full text so far, in Markdown. Pass done = true once it's complete. */
  update(markdown: string, done = false): void {
    if (this.stopped) return;
    const pieces = toSpeechPieces(markdown);
    // The last piece may still be growing, so it waits until the text moves past it.
    const ready = done ? pieces.length : pieces.length - 1;
    while (this.said < ready) this.say(pieces[this.said++]);
    if (done) {
      this.complete = true;
      this.checkFinished();
    }
  }

  /** Stops reading. onFinish isn't called. */
  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    if (this.unfinished > 0) synth?.cancel();
    if (current === this) setCurrent(null);
  }

  private say(text: string): void {
    if (!synth) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = chosenVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? speechLang();
    utterance.rate = getVoicePrefs().rate;
    const ended = () => {
      this.utterances.delete(utterance);
      this.unfinished--;
      this.checkFinished();
    };
    utterance.onend = ended;
    utterance.onerror = ended;
    this.utterances.add(utterance);
    this.unfinished++;
    if (synth.paused) synth.resume();
    synth.speak(utterance);
  }

  private checkFinished(): void {
    if (this.stopped || !this.complete || this.unfinished > 0) return;
    this.stopped = true;
    if (current === this) setCurrent(null);
    this.onFinish?.();
  }
}

let unlocked = false;

/**
 * Call from a tap or click before reading something that arrives later (such as a
 * streamed reply): Safari on iPhone and iPad only speaks once a gesture has started speech.
 */
export function unlockSpeech(): void {
  if (unlocked || !synth || !canSpeak()) return;
  unlocked = true;
  synth.speak(new SpeechSynthesisUtterance(""));
}

/** Starts reading something new under `key`, stopping whatever was being read. */
export function startReading(key: string, onFinish?: () => void): Reading {
  current?.stop();
  if (synth && (synth.speaking || synth.pending)) synth.cancel();
  const reading = new Reading(key, onFinish);
  setCurrent(reading);
  return reading;
}

/** Reads a complete Markdown text aloud. */
export function readAloud(key: string, markdown: string): void {
  startReading(key).update(markdown, true);
}

export function stopReading(): void {
  current?.stop();
}
