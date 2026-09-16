// Every non-Claude provider, through the OpenAI-compatible Chat Completions API
// (POST {baseUrl}/chat/completions), called with fetch.
import { toOutputSchema } from "../schemas";
import { AIError } from "./errors";
import { checkReply, schemaInstruction, stripThinking } from "./json";
import type { AIConfig, AIMessage, JsonMode, StreamRequest, StructuredRequest } from "./types";

interface Attempt {
  /** Send reasoning_effort (when an effort is set). */
  effort: boolean;
  jsonMode: JsonMode;
}

const DOWNGRADE: Record<JsonMode, JsonMode | null> = { json_schema: "json_object", json_object: "prompt", prompt: null };

// Some models reject reasoning_effort or a JSON mode. After a rejection we retry
// with a simpler request and remember what worked for this model, so later calls
// in this session don't repeat the failing attempt.
const learned = new Map<string, Attempt>();
const learnKey = (config: AIConfig) => `${config.provider.id}|${config.baseUrl}|${config.model}`;

function endpoint(config: AIConfig, path: string): string {
  return `${config.baseUrl.trim().replace(/\/+$/, "")}${path}`;
}

/** The API URL answers, but not like an AI API: usually a typo, or it points at a website. */
function wrongUrl(config: AIConfig, what: string): AIError {
  const usual =
    config.provider.baseUrl && config.provider.baseUrl !== config.baseUrl ? ` For ${config.provider.name} it's usually ${config.provider.baseUrl}.` : "";
  return new AIError("setup", `The API URL for ${config.providerName} (${config.baseUrl}) ${what}.${usual} Check the API URL.`);
}

function send(config: AIConfig, path: string, init: RequestInit): Promise<Response> {
  return sendTo(config, endpoint(config, path), init);
}

async function sendTo(config: AIConfig, url: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        ...config.provider.extraHeaders,
      },
    });
  } catch (err) {
    if (init.signal?.aborted) throw err;
    throw new AIError(
      "network",
      `Couldn't reach ${config.providerName} at ${config.baseUrl}. Check your internet connection and the API URL. If it keeps failing, the service may be blocking requests from browsers (CORS).`,
    );
  }
  // A web page instead of JSON: the URL points at a website (often this app itself), not an AI API.
  if ((response.headers.get("content-type") ?? "").includes("text/html")) {
    throw wrongUrl(config, "returned a web page instead of an AI response");
  }
  if (!response.ok) throw await errorFromResponse(config, response);
  return response;
}

async function errorFromResponse(config: AIConfig, response: Response): Promise<AIError> {
  let detail = "";
  let jsonBody = false;
  try {
    const body = (await response.clone().json()) as { error?: { message?: string } | string; message?: string; detail?: string } | null;
    jsonBody = body !== null && typeof body === "object";
    detail = (typeof body?.error === "string" ? body.error : body?.error?.message) ?? body?.message ?? body?.detail ?? "";
  } catch {
    detail = await response.text().catch(() => "");
  }
  detail = detail.slice(0, 300);
  const name = config.providerName;
  const suffix = detail ? ` (${detail})` : "";

  // AI APIs explain a 404 in JSON. A bare 404 means nothing at this address speaks the API.
  if (response.status === 404 && !jsonBody) return wrongUrl(config, "doesn't point to an AI API");

  switch (response.status) {
    case 401:
      return new AIError("auth", `${name} rejected the API key. Check it in Settings.`, detail);
    case 402:
      return new AIError("billing", `${name} says your account is out of credit.${suffix}`, detail);
    case 403:
      return new AIError("permission", `${name} refused access to ${config.model}.${suffix}`, detail);
    case 404:
      return new AIError(
        "not_found",
        `${name} couldn't find the model "${config.model}". Pick another model in Settings (try Load models).`,
        detail,
      );
    case 429:
      return new AIError("rate_limit", `${name}'s rate limit or free quota was reached. Wait a minute and try again.${suffix}`, detail);
  }
  if (response.status >= 500) {
    return new AIError("server", `${name} had a server problem (${response.status}). Try again shortly.`, detail);
  }
  if (/api[ _-]?key|unauthori[sz]ed|invalid.*(key|token)/i.test(detail)) {
    return new AIError("auth", `${name} rejected the API key. Check it in Settings.${suffix}`, detail);
  }
  return new AIError("bad_request", `${name} rejected the request: ${detail || response.statusText || response.status}`, detail);
}

/** The simpler request to try after a rejection, or null when there's nothing left to simplify. */
function simplify(err: AIError, attempt: Attempt, effortSet: boolean): Attempt | null {
  const text = `${err.message} ${err.detail}`.toLowerCase();
  const canDropEffort = attempt.effort && effortSet;
  const nextMode = DOWNGRADE[attempt.jsonMode];
  if (canDropEffort && /reason|effort|think/.test(text)) return { ...attempt, effort: false };
  if (nextMode && /response_format|json|schema|structured/.test(text)) return { ...attempt, jsonMode: nextMode };
  if (canDropEffort) return { ...attempt, effort: false };
  if (nextMode) return { ...attempt, jsonMode: nextMode };
  return null;
}

function requestBody(
  config: AIConfig,
  system: string,
  messages: AIMessage[],
  attempt: Attempt,
  options: { schema?: Record<string, unknown>; stream?: boolean } = {},
) {
  return {
    model: config.model,
    messages: [{ role: "system", content: system }, ...messages],
    ...(attempt.effort && config.effort ? { reasoning_effort: config.effort } : {}),
    ...(attempt.jsonMode === "json_schema" && options.schema
      ? { response_format: { type: "json_schema", json_schema: { name: "reply", strict: true, schema: options.schema } } }
      : {}),
    ...(attempt.jsonMode === "json_object" && options.schema ? { response_format: { type: "json_object" } } : {}),
    ...(options.stream ? { stream: true } : {}),
  };
}

interface CompletionResponse {
  choices?: { message?: { content?: unknown; refusal?: string | null }; finish_reason?: string }[];
}

function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part: unknown) => {
      if (typeof part === "string") return part;
      const text = (part as { text?: unknown } | null)?.text;
      return typeof text === "string" ? text : "";
    })
    .join("");
}

async function complete(config: AIConfig, body: object): Promise<string> {
  const response = await send(config, "/chat/completions", { method: "POST", body: JSON.stringify(body) });
  const data = (await response.json()) as CompletionResponse;
  const choice = data.choices?.[0];
  if (choice?.message?.refusal) {
    throw new AIError("refusal", `${config.providerName} declined this request: ${choice.message.refusal}`);
  }
  const text = contentText(choice?.message?.content);
  if (!text.trim() && choice?.finish_reason === "length") {
    throw new AIError("invalid_output", "The reply was cut off before it finished. Try a lower effort or another model.");
  }
  return text;
}

export async function compatStructured<T>(config: AIConfig, req: StructuredRequest<T>): Promise<T> {
  const schema = toOutputSchema(req.schema);
  const key = learnKey(config);
  let attempt: Attempt = learned.get(key) ?? { effort: true, jsonMode: config.jsonMode };
  let messages = req.messages;
  let repairs = 0;

  for (let tries = 0; tries < 8; tries++) {
    // With json_schema the API enforces the shape; otherwise describe it in the prompt.
    const system = attempt.jsonMode === "json_schema" ? req.system : `${req.system}\n\n${schemaInstruction(schema)}`;
    let text: string;
    try {
      text = await complete(config, requestBody(config, system, messages, attempt, { schema }));
    } catch (err) {
      const next = err instanceof AIError && err.kind === "bad_request" ? simplify(err, attempt, config.effort !== undefined) : null;
      if (!next) throw err;
      attempt = next;
      learned.set(key, attempt);
      continue;
    }

    const checked = checkReply(text, req.schema);
    if (checked.ok) return checked.value;
    if (++repairs > 2) {
      throw new AIError(
        "invalid_output",
        `${config.providerName} kept replying in an unexpected format. Try again, or pick a different model in Settings.`,
        checked.problem,
      );
    }
    // Show the model its mistake and ask for a corrected reply.
    messages = [
      ...messages,
      { role: "assistant", content: text },
      { role: "user", content: `Your reply couldn't be used because ${checked.problem}.\n${schemaInstruction(schema)}` },
    ];
  }
  throw new AIError("invalid_output", `${config.providerName} couldn't produce a usable reply. Try a different model in Settings.`);
}

interface StreamEvent {
  choices?: { delta?: { content?: unknown } }[];
  error?: { message?: string };
}

function parseSseLine(config: AIConfig, line: string): string {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return "";
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === "[DONE]") return "";
  let event: StreamEvent;
  try {
    event = JSON.parse(payload) as StreamEvent;
  } catch {
    return "";
  }
  if (event.error) {
    throw new AIError("server", `${config.providerName} stopped with an error: ${event.error.message ?? "unknown error"}`);
  }
  const content = event.choices?.[0]?.delta?.content;
  return typeof content === "string" ? content : "";
}

async function readStream(config: AIConfig, response: Response, onText: (text: string) => void): Promise<string> {
  if (!response.body) throw new AIError("server", `${config.providerName} didn't send a streamed reply.`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let raw = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const delta = parseSseLine(config, line);
      if (delta) {
        raw += delta;
        onText(stripThinking(raw));
      }
    }
  }
  raw += parseSseLine(config, buffer);
  const text = stripThinking(raw).trim();
  if (!text) throw new AIError("invalid_output", `${config.providerName} sent an empty reply. Try again or pick another model.`);
  return text;
}

export async function compatStream(config: AIConfig, req: StreamRequest): Promise<string> {
  const key = learnKey(config);
  let attempt: Attempt = { effort: learned.get(key)?.effort ?? true, jsonMode: "prompt" };
  const system = `${req.system}\n\n${req.context}`;

  for (;;) {
    try {
      const response = await send(config, "/chat/completions", {
        method: "POST",
        body: JSON.stringify(requestBody(config, system, req.messages, attempt, { stream: true })),
        signal: req.signal,
      });
      return await readStream(config, response, req.onText);
    } catch (err) {
      const next = err instanceof AIError && err.kind === "bad_request" ? simplify(err, attempt, config.effort !== undefined) : null;
      if (!next) throw err;
      attempt = next;
      learned.set(key, { effort: attempt.effort, jsonMode: learned.get(key)?.jsonMode ?? config.jsonMode });
    }
  }
}

interface ModelList {
  data?: { id?: unknown }[];
  models?: { id?: unknown; name?: unknown }[];
}

function modelIds(list: ModelList): string[] {
  const ids = [...(list.data ?? []), ...(list.models ?? [])]
    .map((model) => {
      const m = model as { id?: unknown; name?: unknown };
      const id = typeof m.id === "string" ? m.id : typeof m.name === "string" ? m.name : "";
      return id.replace(/^models\//, "");
    })
    .filter(Boolean);
  return [...new Set(ids)].sort();
}

export async function compatListModels(config: AIConfig): Promise<string[]> {
  const response = await send(config, "/models", { method: "GET" });
  return modelIds((await response.json()) as ModelList);
}
