import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSpeakingKey } from "../hooks/useVoice";
import { canListen, startListening, type Listening } from "../lib/voice/listen";
import { speechLang } from "../lib/voice/prefs";
import { canSpeak, readAloud, stopReading } from "../lib/voice/speak";

// Voice buttons used across the app. Each one hides itself when voice is switched
// off or the browser can't do what it needs.

export const NOT_HEARD = "I didn't catch that. Tap the mic and try again, or type instead.";

export function MicIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

/** Reads a Markdown text aloud, or stops it. */
export function ListenButton({ id, text }: { id: string; text: string }) {
  const speaking = useSpeakingKey() === id;
  if (!canSpeak()) return null;
  return (
    <button
      type="button"
      onClick={() => (speaking ? stopReading() : readAloud(id, text))}
      aria-label={speaking ? "Stop reading aloud" : "Read aloud"}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition ${
        speaking ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      }`}
    >
      {speaking ? <StopIcon /> : <SpeakerIcon />}
      {speaking ? "Stop" : "Listen"}
    </button>
  );
}

/** The mic next to the tutor chat's message box. */
export function MicButton({ listening, onClick }: { listening: boolean; onClick: () => void }) {
  const hint = listening ? "Stop listening and send" : "Speak instead of typing";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={listening}
      aria-label={hint}
      title={hint}
      className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
        listening
          ? "bg-rose-600 text-white shadow-sm hover:bg-rose-500"
          : "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 hover:text-indigo-700"
      }`}
    >
      {listening && <span className="absolute inset-0 animate-ping rounded-lg bg-rose-400/40" aria-hidden="true" />}
      <MicIcon className="relative h-5 w-5" />
    </button>
  );
}

/** An on/off chip for a voice option. */
export function VoiceToggle({
  on,
  onClick,
  title,
  children,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
        on ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-600 ring-slate-200 hover:text-indigo-700 hover:ring-indigo-300"
      }`}
    >
      {children}
    </button>
  );
}

/** A mic that types what the learner says into an answer box, after anything already typed. */
export function DictateButton({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const listenRef = useRef<Listening | null>(null);

  useEffect(() => () => listenRef.current?.cancel(), []);

  if (!canListen()) return null;

  function toggle() {
    if (listenRef.current) {
      listenRef.current.finish();
      return;
    }
    stopReading();
    setNote(null);
    const before = value.trim();
    const withBefore = (heard: string) => (before && heard ? `${before} ${heard}` : before || heard);
    setListening(true);
    listenRef.current = startListening({
      lang: speechLang(),
      onHeard: (heard) => onChange(withBefore(heard)),
      onEnd: (heard, problem) => {
        listenRef.current = null;
        setListening(false);
        if (heard) onChange(withBefore(heard));
        if (problem || !heard) setNote(problem ?? NOT_HEARD);
      },
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
          listening ? "bg-rose-50 text-rose-700 ring-1 ring-rose-300" : "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50"
        }`}
      >
        <MicIcon className={`h-4 w-4 ${listening ? "animate-pulse" : ""}`} />
        {listening ? "Listening… tap to stop" : "Speak answer"}
      </button>
      {note && (
        <span role="status" className="text-xs text-amber-700">
          {note}
        </span>
      )}
    </>
  );
}
