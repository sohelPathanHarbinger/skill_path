// The app's AI tasks: skill check, profile, plan, tutoring and quizzes.
// Which AI runs them is chosen in Settings; lib/ai routes each request.
import { AIError, aiStream, aiStructured } from "./ai";
import type { AIMessage } from "./ai/types";
import {
  ASSESSOR_SYSTEM,
  PLANNER_SYSTEM,
  PROFILER_SYSTEM,
  QUIZ_GRADER_SYSTEM,
  QUIZ_WRITER_SYSTEM,
  RESOURCES_SYSTEM,
  TUTOR_SYSTEM,
  assessmentTranscript,
  learnerIntro,
  moduleBlock,
  planBlock,
  profileBlock,
  quizForGrading,
} from "./prompts";
import {
  AssessmentTurnSchema,
  LearningPlanSchema,
  QuizGradeSchema,
  QuizSchema,
  ResourceListSchema,
  SkillProfileSchema,
  type AssessmentTurn,
  type LearningPlan,
  type Quiz,
  type QuizGrade,
  type ResourceList,
  type SkillProfile,
} from "./schemas";
import type { ChatMessage, Plan, PlanModule, Track } from "./types";

export { isAbortError } from "./ai";

// ---------------------------------------------------------------------------
// 1. Diagnostic assessment: one adaptive question per call.

export function nextAssessmentTurn(track: Track): Promise<AssessmentTurn> {
  const messages: AIMessage[] = [{ role: "user", content: `${learnerIntro(track)}\n\nPlease start the skill check.` }];
  track.assessment.forEach((exchange, i) => {
    messages.push({ role: "assistant", content: JSON.stringify(exchange.turn) });
    if (exchange.answer !== null) {
      messages.push({ role: "user", content: `My answer to question ${i + 1}: ${exchange.answer}` });
    }
  });
  if (messages.at(-1)?.role !== "user") {
    throw new Error("The current question hasn't been answered yet.");
  }
  return aiStructured({ system: ASSESSOR_SYSTEM, messages, schema: AssessmentTurnSchema, cache: true });
}

// ---------------------------------------------------------------------------
// 2. Skill profile and learning plan, built once the assessment is complete.

export function buildProfile(track: Track): Promise<SkillProfile> {
  const content = [
    learnerIntro(track),
    `<assessment_transcript>\n${assessmentTranscript(track)}\n</assessment_transcript>`,
    "Produce the learner's skill profile.",
  ].join("\n\n");
  return aiStructured({ system: PROFILER_SYSTEM, messages: [{ role: "user", content }], schema: SkillProfileSchema });
}

export function buildPlan(track: Track, profile: SkillProfile): Promise<LearningPlan> {
  const content = [
    learnerIntro(track),
    `<skill_profile>\n${profileBlock(profile)}\n</skill_profile>`,
    "Design the learning plan.",
  ].join("\n\n");
  return aiStructured({ system: PLANNER_SYSTEM, messages: [{ role: "user", content }], schema: LearningPlanSchema });
}

/** Courses, videos, websites and practice on different platforms, fitted to the learner's goal and gaps. */
export function recommendResources(track: Track): Promise<ResourceList> {
  const { profile, plan } = requireProfileAndPlan(track);
  const content = [
    learnerIntro(track),
    `<skill_profile>\n${profileBlock(profile)}\n</skill_profile>`,
    `<learning_plan>\n${planBlock(plan)}\n</learning_plan>`,
    "Recommend learning resources for this learner.",
  ].join("\n\n");
  return aiStructured({ system: RESOURCES_SYSTEM, messages: [{ role: "user", content }], schema: ResourceListSchema });
}

// ---------------------------------------------------------------------------
// 3. Tutoring: a streamed, two-way conversation per module.

function requireProfileAndPlan(track: Track): { profile: SkillProfile; plan: Plan } {
  if (!track.profile || !track.plan) throw new Error("This track doesn't have a skill profile and plan yet.");
  return { profile: track.profile, plan: track.plan };
}

function learnerContext(track: Track, module: PlanModule): string {
  const { profile, plan } = requireProfileAndPlan(track);
  return [
    `<learner>\n${learnerIntro(track)}\n\n${profileBlock(profile)}\n</learner>`,
    `<plan>\n${planBlock(plan)}\n</plan>`,
    `<current_module>\n${moduleBlock(module)}\n</current_module>`,
  ].join("\n\n");
}

export function streamTutorReply(options: {
  track: Track;
  module: PlanModule;
  history: ChatMessage[];
  /** Called with the full reply text so far, each time more arrives. */
  onText: (text: string) => void;
  signal: AbortSignal;
}): Promise<string> {
  const { track, module, history, onText, signal } = options;
  return aiStream({
    system: TUTOR_SYSTEM,
    context: learnerContext(track, module),
    messages: history.map((m) => ({ role: m.role, content: m.text })),
    onText,
    signal,
  });
}

// ---------------------------------------------------------------------------
// 4. Module quizzes: generate, then grade and update mastery.

function lessonTranscript(track: Track, module: PlanModule): string {
  const chat = track.chats[module.id] ?? [];
  return chat.map((m) => `${m.role === "user" ? "Learner" : "Tutor"}: ${m.text}`).join("\n\n");
}

export function generateQuiz(track: Track, module: PlanModule): Promise<Quiz> {
  const previous = (track.quizzes[module.id] ?? []).flatMap((attempt) => attempt.quiz.questions.map((q) => q.prompt));
  const lesson = lessonTranscript(track, module);
  const parts = [learnerContext(track, module)];
  if (lesson) parts.push(`<lesson_so_far>\n${lesson}\n</lesson_so_far>`);
  if (previous.length) {
    parts.push(
      `<previous_quiz_questions>\n${previous.join("\n---\n")}\n</previous_quiz_questions>\nWrite new questions; don't repeat these.`,
    );
  }
  parts.push("Write the quiz for the current module.");
  return aiStructured({ system: QUIZ_WRITER_SYSTEM, messages: [{ role: "user", content: parts.join("\n\n") }], schema: QuizSchema });
}

export function gradeQuiz(track: Track, module: PlanModule, quiz: Quiz, answers: string[]): Promise<QuizGrade> {
  const content = [
    learnerContext(track, module),
    `<quiz_with_answers>\n${quizForGrading(quiz, answers)}\n</quiz_with_answers>`,
    "Grade the quiz and update the mastery estimates.",
  ].join("\n\n");
  return aiStructured({ system: QUIZ_GRADER_SYSTEM, messages: [{ role: "user", content }], schema: QuizGradeSchema });
}

// ---------------------------------------------------------------------------

/** A message a learner can act on, for any error from the tasks above. */
export function describeError(err: unknown): string {
  if (err instanceof AIError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}
