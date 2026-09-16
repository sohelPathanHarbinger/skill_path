import { useCallback, useEffect, useRef, useState } from "react";
import { nextAssessmentTurn } from "../lib/learning";
import type { AssessmentTurn } from "../lib/schemas";
import { clearTrackDraft } from "../lib/trackDraft";
import type { AssessmentExchange, Track, UpdateTrack } from "../lib/types";
import { AIErrorPanel } from "./AIErrorPanel";
import { Markdown } from "./Markdown";
import { Badge, Bar, Button, Card, difficultyTone, Spinner } from "./ui";

/** Hard stop in case the assessor never marks the assessment complete. */
const MAX_QUESTIONS = 12;
/** Only used to draw the progress bar. */
const EXPECTED_QUESTIONS = 8;

export function AssessmentView({ track, update }: { track: Track; update: UpdateTrack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const started = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const exchanges = track.assessment;
  const last = exchanges.at(-1);
  const questionCount = exchanges.filter((ex) => !ex.turn.is_complete).length;
  const complete =
    last?.turn.is_complete === true || (questionCount >= MAX_QUESTIONS && last !== undefined && last.answer !== null);
  const needsNextTurn = !complete && (last === undefined || last.answer !== null);
  const awaitingAnswer = last !== undefined && last.answer === null && !last.turn.is_complete;

  const fetchNextTurn = useCallback(
    async (snapshot: Track) => {
      setLoading(true);
      setError(null);
      try {
        const turn = await nextAssessmentTurn(snapshot);
        await update((t) => ({ ...t, assessment: [...t.assessment, { turn, answer: null }] }));
        // The skill check has really started, so the home form can start fresh next time.
        if (snapshot.assessment.length === 0) clearTrackDraft(snapshot.id);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [update],
  );

  // Ask the first question (or resume if the page was closed mid-request).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (needsNextTurn) void fetchNextTurn(track);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [exchanges.length, loading]);

  async function submitAnswer(answer: string) {
    const answered = exchanges.map((ex, i) => (i === exchanges.length - 1 ? { ...ex, answer } : ex));
    await update((t) => ({ ...t, assessment: answered }));
    if (answered.filter((ex) => !ex.turn.is_complete).length >= MAX_QUESTIONS) return;
    await fetchNextTurn({ ...track, assessment: answered });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        <a href="#/" className="text-sm text-slate-500 hover:text-slate-800">
          ← All tracks
        </a>
        <div>
          <p className="text-sm font-medium text-indigo-600">Skill check</p>
          <h1 className="text-2xl font-semibold tracking-tight">{track.skill}</h1>
          <p className="mt-1 text-sm text-slate-600">
            A few questions so everything is pitched at the right level. Answer honestly: "I don't know" is a perfectly
            good answer.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Bar value={complete ? 100 : Math.min(95, (questionCount / EXPECTED_QUESTIONS) * 100)} />
          <span className="shrink-0 text-xs text-slate-500">
            {complete ? "Done" : `Question ${Math.max(questionCount, 1)}`}
          </span>
        </div>
      </header>

      <div className="space-y-5">
        {exchanges.map((exchange, i) => (
          <ExchangeView key={i} exchange={exchange} number={i + 1} />
        ))}
      </div>

      {loading && (
        <Spinner label={exchanges.length === 0 ? "Preparing your first question…" : "Looking at your answer…"} />
      )}
      {error !== null && (
        <AIErrorPanel error={error} onRetry={needsNextTurn ? () => fetchNextTurn(track) : undefined} />
      )}

      {last && awaitingAnswer && !loading && (
        <AnswerBox key={exchanges.length} turn={last.turn} onSubmit={submitAnswer} />
      )}

      {complete && !loading && (
        <Card className="flex flex-wrap items-center justify-between gap-4 bg-indigo-50 ring-indigo-200">
          <p className="text-sm text-indigo-900">That's everything I need. Let's see where you stand.</p>
          <Button onClick={() => update((t) => ({ ...t, stage: "building" }))}>See my skill profile →</Button>
        </Card>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

const QUALITY: Record<AssessmentTurn["previous_answer_quality"], { icon: string; className: string } | null> = {
  none: null,
  correct: { icon: "✓", className: "bg-emerald-100 text-emerald-700" },
  partially_correct: { icon: "◐", className: "bg-amber-100 text-amber-700" },
  incorrect: { icon: "✗", className: "bg-rose-100 text-rose-700" },
  unsure: { icon: "?", className: "bg-slate-200 text-slate-600" },
};

function ExchangeView({ exchange, number }: { exchange: AssessmentExchange; number: number }) {
  const { turn, answer } = exchange;
  const quality = QUALITY[turn.previous_answer_quality];

  return (
    <div className="space-y-3">
      {turn.feedback && (
        <div className="flex items-start gap-2 text-sm text-slate-600">
          {quality && (
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${quality.className}`}>
              {quality.icon}
            </span>
          )}
          <span>{turn.feedback}</span>
        </div>
      )}
      <div className="rounded-2xl rounded-tl-sm bg-white p-5 shadow-sm ring-1 ring-slate-200">
        {!turn.is_complete && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">Question {number}</span>
            <Badge>{turn.question_topic}</Badge>
            <Badge tone={difficultyTone(turn.question_difficulty)}>{turn.question_difficulty}</Badge>
          </div>
        )}
        <Markdown text={turn.question_text} />
      </div>
      {answer !== null && (
        <div className="flex justify-end">
          <div
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-3 text-sm text-white ${
              turn.question_kind === "code" ? "font-mono" : ""
            }`}
          >
            {answer}
          </div>
        </div>
      )}
    </div>
  );
}

function AnswerBox({ turn, onSubmit }: { turn: AssessmentTurn; onSubmit: (answer: string) => void }) {
  const [text, setText] = useState("");
  const dontKnow = (
    <Button variant="ghost" onClick={() => onSubmit("I don't know.")}>
      I don't know
    </Button>
  );

  if (turn.question_kind === "multiple_choice" && turn.options.length > 0) {
    return (
      <div className="space-y-2">
        {turn.options.map((option, i) => {
          const letter = String.fromCharCode(65 + i);
          return (
            <button
              key={i}
              onClick={() => onSubmit(`${letter}. ${option}`)}
              className="flex w-full items-start gap-3 rounded-xl bg-white px-4 py-3 text-left ring-1 ring-slate-200 transition hover:bg-indigo-50 hover:ring-indigo-400"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-indigo-50 text-xs font-bold text-indigo-700">
                {letter}
              </span>
              <span className="min-w-0 flex-1">
                <Markdown text={option} compact />
              </span>
            </button>
          );
        })}
        <div className="pt-1">{dontKnow}</div>
      </div>
    );
  }

  const isCode = turn.question_kind === "code";
  const submit = () => text.trim() && onSubmit(text.trim());

  return (
    <div className="space-y-3">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            submit();
          }
        }}
        rows={isCode ? 8 : 4}
        spellCheck={!isCode}
        placeholder={isCode ? "Write your code or answer here…" : "Type your answer…"}
        className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${
          isCode ? "font-mono" : ""
        }`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={submit} disabled={!text.trim()}>
          Submit answer
        </Button>
        {dontKnow}
        <span className="ml-auto hidden text-xs text-slate-400 sm:inline">Ctrl + Enter to submit</span>
      </div>
    </div>
  );
}
