import { useEffect, useState, useSyncExternalStore } from "react";
import { getVoicePrefs, subscribeVoicePrefs, type VoicePrefs } from "../lib/voice/prefs";
import { listVoices, onVoicesChanged, speakingKey, subscribeSpeaking } from "../lib/voice/speak";

export function useVoicePrefs(): VoicePrefs {
  return useSyncExternalStore(subscribeVoicePrefs, getVoicePrefs);
}

/** The key of what is being read aloud, or null. */
export function useSpeakingKey(): string | null {
  return useSyncExternalStore(subscribeSpeaking, speakingKey);
}

/** The browser's voices, updated once it has loaded them. */
export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState(listVoices);
  useEffect(() => {
    setVoices(listVoices());
    return onVoicesChanged(() => setVoices(listVoices()));
  }, []);
  return voices;
}
