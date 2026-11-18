import { useEffect, useRef, useState } from "react";
import { useSpeakingKey, useVoicePrefs } from "../hooks/useVoice";
import { isAbortError, streamTutorReply } from "../lib/learning";
import type { ChatMessage, PlanModule, Track, UpdateTrack } from "../lib/types";
import { canListen, startListening, type Listening } from "../lib/voice/listen";
import { getVoicePrefs, speechLang, updateVoicePrefs } from "../lib/voice/prefs";
import { canSpeak, startReading, stopReading, unlockSpeech } from "../lib/voice/speak";
import { AIErrorPanel } from "./AIErrorPanel";
import { Markdown } from "./Markdown";
import { Button, Card, Dialog } from "./ui";
import { ListenButton, MicButton, MicIcon, NOT_HEARD, VoiceToggle } from "./VoiceControls";
import { VoiceSettings } from "./VoiceSettings";

const KICKOFF = "I'm ready to start this module.";
const STOPPED = "\n\n*(stopped)*";

const QUICK_REPLIES = [
  "Explain that another way",
  "Show me an example",
  "Give me a practice exercise",
  "I know this already, go faster",
  "Slow down, I'm lost",
];

/** The key a tutor message is read aloud under, so its Listen button can show Stop. */
const messageKey = (moduleId: string, index: number) => `tutor:${moduleId}:${index}`;

/** What the voice callbacks need from the latest render. */
interface VoiceActions {
  send: (text: string, spoken: boolean) => void;
  listen: () => void;
  busy: boolean;
}

export function TutorChat({ track, module, update }: { track: Track; module: PlanModule; update: UpdateTrack }) {
  const messages = track.chats[module.id] ?? [];
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listenRef = useRef<Listening | null>(null);
  // Speech ends after later renders, so voice callbacks act through the latest render's functions.
  const latest = useRef<VoiceActions | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const voice = useVoicePrefs();
  const speakingKey = useSpeakingKey();
  const busy = streaming !== null;
  const awaitingReply = !busy && messages.at(-1)?.role === "user";
  const micOk = canListen();
  const speakOk = canSpeak();

  // Follow new text, unless the learner has scrolled up to reread something.
  useEffect(() => {
    const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 240;
    if (nearBottom) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, streaming]);

  // Stop streaming if the learner leaves the module.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Stop listening and reading aloud when the learner leaves the module or opens another.
  useEffect(
    () => () => {
      listenRef.current?.cancel();
      listenRef.current = null;
      setListening(false);
      stopReading();
    },
    [module.id],
  );

  const saveChat = (history: ChatMessage[]) =>
    update((t) => ({ ...t, chats: { ...t.chats, [module.id]: history } }));

  async function runReply(history: ChatMessage[], speak: boolean) {
    setError(null);
    setStreaming("");
    const controller = new AbortController();
    abortRef.current = controller;
    // Read the reply aloud as it streams in; hands-free then listens for the learner's answer.
    const reading =
      speak && speakOk
        ? startReading(messageKey(module.id, history.length), () => {
            if (getVoicePrefs().handsFree) latest.current?.listen();
          })
        : null;
    let partial = "";
    try {
      const reply = await streamTutorReply({
        track,
        module,
        history,
        voice: reading !== null,
        signal: controller.signal,
        onText: (text) => {
          partial = text;
          setStreaming(text);
          reading?.update(text);
        },
      });
      reading?.update(reply, true);
      await saveChat([...history, { role: "assistant", text: reply }]);
    } catch (err) {
      reading?.stop();
      if (isAbortError(err)) {
        if (partial.trim()) await saveChat([...history, { role: "assistant", text: `${partial}${STOPPED}` }]);
      } else {
        setError(err);
      }
    } finally {
      abortRef.current = null;
      setStreaming(null);
    }
  }

  /** Sends a message. Replies to spoken messages are read aloud. */
  async function send(text: string, spoken = false) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    unlockSpeech();
    listenRef.current?.cancel();
    listenRef.current = null;
    setListening(false);
    setVoiceNote(null);
    stopReading();
    setDraft("");
    const history: ChatMessage[] = [...messages, { role: "user", text: trimmed }];
    await saveChat(history);
    await runReply(history, spoken || voice.readAloud);
  }

  /** Listens to the learner, showing the words as they come, and sends them when the learner pauses. */
  function listen() {
    if (!micOk || listenRef.current) return;
    unlockSpeech();
    stopReading();
    setVoiceNote(null);
    const before = draft.trim();
    const withDraft = (heard: string) => (before && heard ? `${before} ${heard}` : before || heard);
    setListening(true);
    listenRef.current = startListening({
      lang: speechLang(),
      onHeard: (heard) => setDraft(withDraft(heard)),
      onEnd: (heard, problem) => {
        listenRef.current = null;
        setListening(false);
        if (!heard) {
          setVoiceNote(problem ?? NOT_HEARD);
          return;
        }
        const text = withDraft(heard);
        setDraft(text);
        if (problem) setVoiceNote(problem);
        if (latest.current?.busy) setVoiceNote("Your words are in the box. Press Send when the tutor has finished.");
        else latest.current?.send(text, true);
      },
    });
  }

  function toggleMic() {
    if (listenRef.current) listenRef.current.finish();
    else listen();
  }

  function toggleReadAloud() {
    if (voice.readAloud) stopReading();
    updateVoicePrefs({ readAloud: !voice.readAloud });
  }

  function toggleHandsFree() {
    const on = !voice.handsFree;
    updateVoicePrefs({ handsFree: on });
    // Nothing else going on: start listening straight away.
    if (on && !busy && speakingKey === null) listen();
  }

  latest.current = { send: (text, spoken) => void send(text, spoken), listen, busy };

  if (messages.length === 0 && !busy) {
    return (
      <Card className="space-y-4 text-center">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Ready when you are</h2>
          <p className="text-sm text-slate-600">
            Your tutor teaches this module step by step, checks your understanding as you go and adjusts to how you're
            doing. Ask anything, any time.
          </p>
        </div>
        {error !== null && <AIErrorPanel error={error} />}
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => send(KICKOFF)}>Start the lesson</Button>
          {speakOk && (
            <Button variant="secondary" onClick={() => send(KICKOFF, true)}>
              <MicIcon />
              Start with voice
            </Button>
          )}
        </div>
        {speakOk && (
          <p className="text-xs text-slate-500">
            With voice, the tutor reads its replies aloud
            {micOk ? " and you answer by tapping the mic and speaking" : ""}. The text stays on screen.
          </p>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message, i) => (
        <Bubble key={i} message={message} listenKey={speakOk ? messageKey(module.id, i) : undefined} />
      ))}
      {busy && (streaming ? <Bubble message={{ role: "assistant", text: streaming }} streaming /> : <TypingDots />)}

      {error !== null && (
        <AIErrorPanel error={error} onRetry={awaitingReply ? () => runReply(messages, voice.readAloud) : undefined} />
      )}
      {awaitingReply && error === null && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          The tutor's reply didn't finish.
          <Button variant="secondary" onClick={() => runReply(messages, voice.readAloud)}>
            Get reply
          </Button>
        </div>
      )}
      <div ref={bottomRef} />

      <div className="sticky bottom-0 space-y-2 bg-slate-50/95 pb-4 pt-3 backdrop-blur">
        {!busy && !listening && (
          <div className="flex flex-wrap gap-2">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply}
                onClick={() => send(reply)}
                className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200 transition hover:text-indigo-700 hover:ring-indigo-300"
              >
                {reply}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(draft);
              }
            }}
            readOnly={listening}
            rows={2}
            placeholder={
              listening ? "Listening… speak now" : "Answer the tutor or ask a question… (Shift + Enter for a new line)"
            }
            className={`min-w-0 flex-1 resize-none rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${
              listening ? "border-rose-300" : "border-slate-300"
            }`}
          />
          {micOk && <MicButton listening={listening} onClick={toggleMic} />}
          {busy ? (
            <Button variant="secondary" onClick={() => abortRef.current?.abort()}>
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!draft.trim()}>
              Send
            </Button>
          )}
        </form>
        {(speakOk || micOk) && (
          <div className="flex flex-wrap items-center gap-2">
            {speakOk && (
              <VoiceToggle on={voice.readAloud} onClick={toggleReadAloud} title="Read every reply aloud, even when you type">
                Read replies aloud
              </VoiceToggle>
            )}
            {speakOk && micOk && (
              <VoiceToggle
                on={voice.handsFree}
                onClick={toggleHandsFree}
                title="After a reply is read aloud, listen for your answer without a tap"
              >
                Hands-free
              </VoiceToggle>
            )}
            {speakingKey !== null && (
              <button
                type="button"
                onClick={stopReading}
                className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100"
              >
                ■ Stop reading
              </button>
            )}
            <button
              type="button"
              onClick={() => setVoiceSettingsOpen(true)}
              className="ml-auto text-xs font-medium text-slate-500 hover:text-indigo-700"
            >
              Voice settings
            </button>
          </div>
        )}
        {listening && (
          <p role="status" className="text-xs text-rose-700">
            Listening… speak now. Pause when you're done, or tap the mic to send.
          </p>
        )}
        {voiceNote && !listening && (
          <p role="status" className="text-xs text-amber-700">
            {voiceNote}
          </p>
        )}
      </div>

      {voiceSettingsOpen && (
        <Dialog title="Voice settings" onClose={() => setVoiceSettingsOpen(false)}>
          <VoiceSettings />
        </Dialog>
      )}
    </div>
  );
}

function Avatar() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
      AI
    </span>
  );
}

function Bubble({
  message,
  streaming = false,
  listenKey,
}: {
  message: ChatMessage;
  streaming?: boolean;
  /** Shows a Listen button that reads the message aloud under this key. */
  listenKey?: string;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-3 text-sm text-white">
          {message.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <Avatar />
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
        <Markdown text={message.text} />
        {streaming && <span className="mt-1 inline-block h-4 w-1.5 animate-pulse bg-indigo-400 align-middle" />}
        {listenKey && (
          <div className="-mb-2 -ml-2 mt-1">
            <ListenButton id={listenKey} text={message.text.replace(STOPPED, "")} />
          </div>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-3" role="status" aria-label="Tutor is thinking">
      <Avatar />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-white px-4 py-3 ring-1 ring-slate-200">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
