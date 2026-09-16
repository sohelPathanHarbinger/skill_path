// The app's own data model: one Track per skill a learner is working on.
// Everything is stored in IndexedDB in the learner's browser.
import type { AssessmentTurn, LearningModule, Quiz, QuizGrade, ResourceList, SkillProfile } from "./schemas";

export interface SavedResources extends ResourceList {
  at: number;
}

export type Stage = "assessment" | "building" | "learning";

export interface AssessmentExchange {
  turn: AssessmentTurn;
  /** null while the learner hasn't answered yet */
  answer: string | null;
}

export type ModuleStatus = "not_started" | "in_progress" | "completed";

export interface PlanModule extends LearningModule {
  id: string;
  status: ModuleStatus;
  bestScore: number | null;
}

export interface Plan {
  overview: string;
  modules: PlanModule[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface QuizAttempt {
  quiz: Quiz;
  answers: string[];
  /** null until the attempt is submitted and graded */
  grade: QuizGrade | null;
  at: number;
}

export interface Track {
  id: string;
  skill: string;
  goal: string;
  background: string;
  createdAt: number;
  updatedAt: number;
  stage: Stage;
  assessment: AssessmentExchange[];
  profile: SkillProfile | null;
  plan: Plan | null;
  /** tutor conversation per module id */
  chats: Record<string, ChatMessage[]>;
  /** quiz attempts per module id, oldest first */
  quizzes: Record<string, QuizAttempt[]>;
  /** suggested courses and materials; missing on tracks created before this existed */
  resources?: SavedResources | null;
}

export type UpdateTrack = (mutate: (track: Track) => Track) => Promise<void>;
