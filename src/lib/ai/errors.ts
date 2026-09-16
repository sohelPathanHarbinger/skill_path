export type AIErrorKind =
  | "setup"
  | "auth"
  | "billing"
  | "permission"
  | "not_found"
  | "rate_limit"
  | "bad_request"
  | "server"
  | "network"
  | "refusal"
  | "invalid_output";

/** A failure from any AI provider, with a message a learner can act on. */
export class AIError extends Error {
  readonly kind: AIErrorKind;
  /** The provider's own error text, when it gave one. */
  readonly detail: string;

  constructor(kind: AIErrorKind, message: string, detail = "") {
    super(message);
    this.name = "AIError";
    this.kind = kind;
    this.detail = detail;
  }
}

/** True when the learner pressed Stop (or left the page) mid-request. */
export function isAbortError(err: unknown): boolean {
  return (err instanceof DOMException || err instanceof Error) && err.name === "AbortError";
}
