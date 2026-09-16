// Shapes of everything Claude returns as structured output. The Zod schemas are
// sent to the API as JSON schemas (see toOutputSchema), so the model's reply is
// constrained to these shapes. The .describe() texts are part of the prompt:
// they tell the model what each field means.
import { z } from "zod";

/**
 * JSON schema for the API's structured-output format. Built with Zod's own
 * converter because it keeps `enum` constraints; the SDK's zod helper turns
 * them into description text, which the API doesn't enforce.
 */
export function toOutputSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = { ...z.toJSONSchema(schema) } as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema;
}

export const LEVELS = ["beginner", "elementary", "intermediate", "advanced", "expert"] as const;
export type Level = (typeof LEVELS)[number];

const DIFFICULTY = z.enum(["easy", "medium", "hard"]);

export const AssessmentTurnSchema = z.object({
  feedback: z
    .string()
    .describe("One or two warm, honest sentences about the learner's previous answer. Empty string on the first turn."),
  previous_answer_quality: z
    .enum(["none", "correct", "partially_correct", "incorrect", "unsure"])
    .describe("Your judgement of the learner's previous answer. 'none' on the first turn."),
  is_complete: z
    .boolean()
    .describe("true once you have enough evidence to place the learner. On that turn question_text is a short closing message."),
  question_topic: z.string().describe("The sub-topic this question probes."),
  question_difficulty: DIFFICULTY,
  question_kind: z.enum(["multiple_choice", "short_answer", "code", "experience"]),
  question_text: z.string().describe("The question in Markdown. Use fenced code blocks with a language tag for code."),
  options: z
    .array(z.string())
    .describe("Exactly 4 options for multiple_choice, without letter prefixes. An empty array for every other kind."),
});
export type AssessmentTurn = z.infer<typeof AssessmentTurnSchema>;

export const SkillProfileSchema = z.object({
  level: z.enum(LEVELS),
  score: z.number().describe("Overall proficiency on the skill, 0-100."),
  summary: z.string().describe("Two or three sentences addressed to the learner about where they stand."),
  subtopics: z.array(
    z.object({
      name: z.string(),
      mastery: z.number().describe("0-100."),
      evidence: z.string().describe("What in the assessment supports this estimate, or a note that evidence was thin."),
    }),
  ),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  misconceptions: z.array(z.string()),
  learning_notes: z
    .string()
    .describe("Notes for the tutor: what to build on, what not to re-teach, suggested pace and depth."),
});
export type SkillProfile = z.infer<typeof SkillProfileSchema>;

export const LearningPlanSchema = z.object({
  overview: z.string().describe("Two or three sentences addressed to the learner describing the path ahead."),
  modules: z.array(
    z.object({
      title: z.string(),
      objective: z.string().describe("A concrete, checkable statement of what the learner will be able to do afterwards."),
      why: z.string().describe("One sentence telling the learner why this module is in their plan."),
      subtopics: z.array(z.string()),
      estimated_minutes: z.number(),
      difficulty: DIFFICULTY,
    }),
  ),
});
export type LearningPlan = z.infer<typeof LearningPlanSchema>;
export type LearningModule = LearningPlan["modules"][number];

/** Where a recommended resource lives. The app links to each by searching its title there (see lib/resources.ts). */
export const PLATFORM_IDS = [
  "youtube",
  "udemy",
  "coursera",
  "edx",
  "freecodecamp",
  "codecademy",
  "pluralsight",
  "linkedin_learning",
  "khan_academy",
  "datacamp",
  "frontend_masters",
  "real_python",
  "geeksforgeeks",
  "w3schools",
  "mdn",
  "exercism",
  "hackerrank",
  "github",
  "official_docs",
  "book",
  "other",
] as const;
export type PlatformId = (typeof PLATFORM_IDS)[number];

export const LearningResourceSchema = z.object({
  title: z.string().describe("The exact published title, so it can be found by searching it on the platform."),
  author: z.string().describe("Instructor, channel, publisher or organisation. Empty string if unknown."),
  platform: z
    .enum(PLATFORM_IDS)
    .describe("Where it lives. official_docs for the skill's own documentation, book for books, other for any other website."),
  format: z.enum(["video_course", "video_series", "written_course", "book", "interactive", "documentation", "practice"]),
  cost: z
    .enum(["free", "free_to_audit", "paid", "subscription"])
    .describe("free_to_audit: free to watch or read, with a paid certificate."),
  level: z.enum(["beginner", "intermediate", "advanced", "all_levels"]),
  hours: z.number().describe("Rough total hours of material; 0 if unknown."),
  why: z.string().describe("One or two sentences on how this helps this learner's goal and gaps."),
  covers: z.array(z.string()).describe("Profile sub-topics this resource helps with."),
  modules: z.array(z.number()).describe("Plan module numbers (1-based) it supports best; empty for a whole-path resource."),
  top_pick: z.boolean().describe("true for the 2 or 3 resources to start with."),
  url: z.string().describe("A direct link only if certainly correct and stable; otherwise an empty string."),
});
export type LearningResource = z.infer<typeof LearningResourceSchema>;

export const ResourceListSchema = z.object({
  summary: z.string().describe("Two sentences to the learner on how to combine these resources with their plan."),
  resources: z.array(LearningResourceSchema),
});
export type ResourceList = z.infer<typeof ResourceListSchema>;

export const QuizSchema = z.object({
  questions: z.array(
    z.object({
      kind: z.enum(["multiple_choice", "short_answer", "code"]),
      prompt: z.string().describe("The question in Markdown."),
      options: z
        .array(z.string())
        .describe("Exactly 4 options for multiple_choice, without letter prefixes. An empty array otherwise."),
      subtopic: z.string(),
    }),
  ),
});
export type Quiz = z.infer<typeof QuizSchema>;

export const QuizGradeSchema = z.object({
  results: z
    .array(
      z.object({
        verdict: z.enum(["correct", "partially_correct", "incorrect"]),
        feedback: z.string(),
      }),
    )
    .describe("One entry per question, in question order."),
  overall_score: z.number().describe("0-100 across the whole quiz."),
  summary: z.string(),
  mastery_updates: z.array(
    z.object({
      subtopic: z.string(),
      mastery: z.number().describe("New 0-100 estimate."),
    }),
  ),
  next_step: z.string(),
});
export type QuizGrade = z.infer<typeof QuizGradeSchema>;
