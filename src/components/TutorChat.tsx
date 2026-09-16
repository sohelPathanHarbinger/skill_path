import { useEffect, useRef, useState } from "react";
import { isAbortError, streamTutorReply } from "../lib/learning";
import type { ChatMessage, PlanModule, Track, UpdateTrack } from "../lib/types";
import { AIErrorPanel } from "./AIErrorPanel";
import { Markdown } from "./Markdown";
import { Button, Card } from "./ui";

const KICKOFF = "I'm ready to start this module.";

const QUICK_REPLIES = [
  "Explain that another way",
  "Show me an example",
  "Give me a practice exercise",
  "I know this already, go faster",
  "Slow down, I'm lost",
];

export function TutorChat({ track, module, update }: { track: Track; module: PlanModule; update: UpdateTrack }) {
  const messages = track.chats[module.id] ?? [];
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = streaming !== null;
  const awaitingReply = !busy && messages.at(-1)?.role === "user";

  // Follow new text, unless the learner has scrolled up to reread something.
  useEffect(() => {
    const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 240;
    if (nearBottom) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, streaming]);

  // Stop streaming if the learner leaves the module.
  useEffect(() => () => abortRef.current?.abort(), []);

  const saveChat = (history: ChatMessage[]) =>
    update((t) => ({ ...t, chats: { ...t.chats, [module.id]: history } }));

  async function runReply(history: ChatMessage[]) {
    setError(null);
    setStreaming("");
    const controller = new AbortController();
    abortRef.current = controller;
    let partial = "";
    try {
      const reply = await streamTutorReply({
        track,
        module,
        history,
        signal: controller.signal,
        onText: (text) => {
          partial = text;
          setStreaming(text);
        },
      });
      await saveChat([...history, { role: "assistant", text: reply }]);
    } catch (err) {
      if (isAbortError(err)) {
        if (partial.trim()) await saveChat([...history, { role: "assistant", text: `${partial}\n\n*(stopped)*` }]);
      } else {
        setError(err);
      }
    } finally {
      abortRef.current = null;
      setStreaming(null);
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setDraft("");
    const history: ChatMessage[] = [...messages, { role: "user", text: trimmed }];
    await saveChat(history);
    await runReply(history);
  }

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
        <Button onClick={() => send(KICKOFF)}>Start the lesson</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message, i) => (
        <Bubble key={i} message={message} />
      ))}
      {busy && (streaming ? <Bubble message={{ role: "assistant", text: streaming }} streaming /> : <TypingDots />)}

      {error !== null && <AIErrorPanel error={error} onRetry={awaitingReply ? () => runReply(messages) : undefined} />}
      {awaitingReply && error === null && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          The tutor's reply didn't finish.
          <Button variant="secondary" onClick={() => runReply(messages)}>
            Get reply
          </Button>
        </div>
      )}
      <div ref={bottomRef} />

      <div className="sticky bottom-0 space-y-2 bg-slate-50/95 pb-4 pt-3 backdrop-blur">
        {!busy && (
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
            rows={2}
            placeholder="Answer the tutor or ask a question… (Shift + Enter for a new line)"
            className="min-w-0 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
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
      </div>
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

function Bubble({ message, streaming = false }: { message: ChatMessage; streaming?: boolean }) {
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
