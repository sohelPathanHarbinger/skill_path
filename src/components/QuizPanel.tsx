import { useState } from "react";
import { generateQuiz, gradeQuiz } from "../lib/learning";
import { applyMasteryUpdates, clampScore, PASS_SCORE, updateModule } from "../lib/progress";
import type { QuizGrade } from "../lib/schemas";
import type { PlanModule, QuizAttempt, Track, UpdateTrack } from "../lib/types";
import { AIErrorPanel } from "./AIErrorPanel";
import { Markdown } from "./Markdown";
import { Badge, Button, Card, Spinner } from "./ui";

interface Props {
  track: Track;
  module: PlanModule;
  update: UpdateTrack;
  onBackToLesson: () => void;
  onNextModule?: () => void;
}

const VERDICT: Record<QuizGrade["results"][number]["verdict"], { label: string; tone: "emerald" | "amber" | "rose" }> = {
  correct: { label: "Correct", tone: "emerald" },
  partially_correct: { label: "Partly correct", tone: "amber" },
  incorrect: { label: "Not quite", tone: "rose" },
};

const letter = (index: number) => String.fromCharCode(65 + index);

export function QuizPanel({ track, module, update, onBackToLesson, onNextModule }: Props) {
  const attempts = track.quizzes[module.id] ?? [];
  const current = attempts.at(-1);
  const [answers, setAnswers] = useState<string[]>(() => (current && !current.grade ? current.answers : []));
  const [busy, setBusy] = useState<"writing" | "grading" | null>(null);
  const [error, setError] = useState<unknown>(null);

  async function startQuiz() {
    setBusy("writing");
    setError(null);
    try {
      const quiz = await generateQuiz(track, module);
      const attempt: QuizAttempt = { quiz, answers: quiz.questions.map(() => ""), grade: null, at: Date.now() };
      setAnswers(attempt.answers);
      await update((t) => ({
        ...t,
        quizzes: { ...t.quizzes, [module.id]: [...(t.quizzes[module.id] ?? []), attempt] },
      }));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    if (!current || current.grade) return;
    setBusy("grading");
    setError(null);
    try {
      const grade = await gradeQuiz(track, module, current.quiz, answers);
      const score = clampScore(grade.overall_score);
      const passed = score >= PASS_SCORE;
      await update((t) => {
        const list = [...(t.quizzes[module.id] ?? [])];
        list[list.length - 1] = { ...list[list.length - 1], answers, grade };
        const withModule = updateModule(t, module.id, (m) => ({
          status: passed || m.status === "completed" ? "completed" : "in_progress",
          bestScore: Math.max(m.bestScore ?? 0, score),
        }));
        return {
          ...withModule,
          profile: t.profile && applyMasteryUpdates(t.profile, grade.mastery_updates),
          quizzes: { ...t.quizzes, [module.id]: list },
        };
      });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  }

  function setAnswer(index: number, value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  if (busy === "writing") {
    return (
      <Card>
        <Spinner label="Writing a quiz for you…" />
      </Card>
    );
  }

  if (!current) {
    return (
      <Card className="space-y-4 text-center">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Check your understanding</h2>
          <p className="text-sm text-slate-600">
            4 questions on “{module.title}”, pitched at your level. Score {PASS_SCORE}% or more to complete the module.
            Your results update your skill profile.
          </p>
        </div>
        {error !== null && <AIErrorPanel error={error} onRetry={startQuiz} />}
        <Button onClick={startQuiz}>Start quiz</Button>
      </Card>
    );
  }

  if (current.grade) {
    return (
      <QuizResults
        attempt={current}
        grade={current.grade}
        error={error}
        onRetake={startQuiz}
        onBackToLesson={onBackToLesson}
        onNextModule={onNextModule}
      />
    );
  }

  const questions = current.quiz.questions;
  const unanswered = questions.filter((_, i) => !answers[i]?.trim()).length;

  return (
    <div className="space-y-5">
      {questions.map((q, i) => (
        <Card key={i} className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">
              Question {i + 1} of {questions.length}
            </span>
            <Badge>{q.subtopic}</Badge>
          </div>
          <Markdown text={q.prompt} />
          {q.kind === "multiple_choice" && q.options.length > 0 ? (
            <div className="space-y-2">
              {q.options.map((option, j) => {
                const value = `${letter(j)}. ${option}`;
                const selected = answers[i] === value;
                return (
                  <button
                    key={j}
                    onClick={() => setAnswer(i, value)}
                    aria-pressed={selected}
                    className={`flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left transition ${
                      selected ? "bg-indigo-50 ring-2 ring-indigo-500" : "bg-white ring-1 ring-slate-200 hover:ring-indigo-300"
                    }`}
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-indigo-50 text-xs font-bold text-indigo-700">
                      {letter(j)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <Markdown text={option} compact />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              value={answers[i] ?? ""}
              onChange={(e) => setAnswer(i, e.target.value)}
              rows={q.kind === "code" ? 7 : 3}
              spellCheck={q.kind !== "code"}
              placeholder={q.kind === "code" ? "Write your code or answer…" : "Type your answer…"}
              className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${
                q.kind === "code" ? "font-mono" : ""
              }`}
            />
          )}
        </Card>
      ))}

      {error !== null && <AIErrorPanel error={error} onRetry={submit} />}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={submit} disabled={busy === "grading"}>
          Submit answers
        </Button>
        {busy === "grading" ? (
          <Spinner label="Grading your answers…" />
        ) : (
          unanswered > 0 && <span className="text-sm text-slate-500">{unanswered} unanswered</span>
        )}
      </div>
    </div>
  );
}

function QuizResults({
  attempt,
  grade,
  error,
  onRetake,
  onBackToLesson,
  onNextModule,
}: {
  attempt: QuizAttempt;
  grade: QuizGrade;
  error: unknown;
  onRetake: () => void;
  onBackToLesson: () => void;
  onNextModule?: () => void;
}) {
  const score = clampScore(grade.overall_score);
  const passed = score >= PASS_SCORE;

  return (
    <div className="space-y-5">
      <Card className={`space-y-3 ${passed ? "bg-emerald-50 ring-emerald-200" : "bg-amber-50 ring-amber-200"}`}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-4xl font-semibold tabular-nums">{score}%</span>
          <Badge tone={passed ? "emerald" : "amber"}>{passed ? "Module complete" : `${PASS_SCORE}% needed to pass`}</Badge>
        </div>
        <p className="text-sm text-slate-700">{grade.summary}</p>
        <p className="text-sm text-slate-700">
          <span className="font-medium">Next step:</span> {grade.next_step}
        </p>
      </Card>

      {attempt.quiz.questions.map((q, i) => {
        const result = grade.results[i];
        return (
          <Card key={i} className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500">Question {i + 1}</span>
              {result && <Badge tone={VERDICT[result.verdict].tone}>{VERDICT[result.verdict].label}</Badge>}
            </div>
            <Markdown text={q.prompt} />
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Your answer</span>
              <p className={`mt-1 whitespace-pre-wrap text-slate-800 ${q.kind === "code" ? "font-mono" : ""}`}>
                {attempt.answers[i]?.trim() || "(blank)"}
              </p>
            </div>
            {result && <Markdown text={result.feedback} />}
          </Card>
        );
      })}

      {error !== null && <AIErrorPanel error={error} onRetry={onRetake} />}
      <div className="flex flex-wrap gap-3">
        {passed && onNextModule && <Button onClick={onNextModule}>Next module →</Button>}
        <Button variant={passed ? "secondary" : "primary"} onClick={onBackToLesson}>
          {passed ? "Back to lesson" : "Review with the tutor"}
        </Button>
        <Button variant="secondary" onClick={onRetake}>
          Take a new quiz
        </Button>
      </div>
    </div>
  );
}
