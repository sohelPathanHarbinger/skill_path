// Claude, through the official Anthropic SDK.
import Anthropic from "@anthropic-ai/sdk";
import { toOutputSchema } from "../schemas";
import { AIError } from "./errors";
import { checkReply } from "./json";
import type { AIConfig, StreamRequest, StructuredRequest } from "./types";

type ClaudeEffort = "low" | "medium" | "high" | "xhigh" | "max";

let cachedClient: Anthropic | null = null;
let cachedKey = "";

function client(config: AIConfig): Anthropic {
  if (cachedClient && cachedKey === config.apiKey) return cachedClient;
  cachedClient = new Anthropic({ apiKey: config.apiKey, dangerouslyAllowBrowser: true });
  cachedKey = config.apiKey;
  return cachedClient;
}

/** Current models: adaptive thinking sized by effort. Models without effort run without thinking. */
function reasoning(config: AIConfig) {
  const effort = config.effort as ClaudeEffort | undefined;
  return { effort, thinking: effort ? ({ type: "adaptive" } as const) : undefined };
}

/** Turns SDK errors into AIErrors (and a pressed Stop into an AbortError). */
async function call<R>(config: AIConfig, run: () => Promise<R>): Promise<R> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof Anthropic.APIUserAbortError) throw new DOMException("Stopped", "AbortError");
    if (err instanceof Anthropic.AuthenticationError) {
      throw new AIError("auth", "Anthropic rejected the API key. Check it in Settings.");
    }
    if (err instanceof Anthropic.PermissionDeniedError) {
      throw new AIError("permission", `This Anthropic key isn't allowed to use ${config.model}. Pick another model in Settings.`);
    }
    if (err instanceof Anthropic.NotFoundError) {
      throw new AIError("not_found", `Anthropic couldn't find the model "${config.model}". Pick another model in Settings.`);
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new AIError("rate_limit", "Anthropic's rate limit was reached. Wait a moment, then try again.");
    }
    if (err instanceof Anthropic.BadRequestError) {
      throw new AIError("bad_request", `Anthropic rejected the request: ${err.message}`, err.message);
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new AIError("network", "Couldn't reach Anthropic. Check your internet connection.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new AIError("server", `Anthropic API error${err.status ? ` (${err.status})` : ""}: ${err.message}`);
    }
    throw err;
  }
}

// Claude may decline requests on high-risk topics. That arrives as a normal
// response with stop_reason "refusal", not as an HTTP error.
function throwIfRefused(message: Anthropic.Message): void {
  if (message.stop_reason === "refusal") {
    const explanation = message.stop_details?.explanation;
    throw new AIError("refusal", `Claude declined this request${explanation ? `: ${explanation}` : "."} Try rephrasing your message.`);
  }
}

const replyText = (message: Anthropic.Message) =>
  message.content.map((block) => (block.type === "text" ? block.text : "")).join("");

export function anthropicStructured<T>(config: AIConfig, req: StructuredRequest<T>): Promise<T> {
  return call(config, async () => {
    const { effort, thinking } = reasoning(config);
    const response = await client(config).messages.create({
      model: config.model,
      max_tokens: 16000,
      thinking,
      output_config: { effort, format: { type: "json_schema", schema: toOutputSchema(req.schema) } },
      cache_control: req.cache ? { type: "ephemeral" } : undefined,
      system: req.system,
      messages: req.messages,
    });
    throwIfRefused(response);
    if (response.stop_reason === "max_tokens") {
      throw new AIError("invalid_output", "Claude's reply was cut off before it finished. Please try again.");
    }
    const checked = checkReply(replyText(response), req.schema);
    if (!checked.ok) throw new AIError("invalid_output", "Claude's reply couldn't be read. Please try again.", checked.problem);
    return checked.value;
  });
}

export function anthropicStream(config: AIConfig, req: StreamRequest): Promise<string> {
  return call(config, async () => {
    const { effort, thinking } = reasoning(config);
    const stream = client(config).messages.stream(
      {
        model: config.model,
        max_tokens: 32000,
        thinking,
        output_config: effort ? { effort } : undefined,
        cache_control: { type: "ephemeral" },
        system: [
          { type: "text", text: req.system },
          { type: "text", text: req.context },
        ],
        messages: req.messages,
      },
      { signal: req.signal },
    );
    let text = "";
    stream.on("text", (delta) => {
      text += delta;
      req.onText(text);
    });
    const message = await stream.finalMessage();
    throwIfRefused(message);
    return replyText(message);
  });
}

export function anthropicListModels(config: AIConfig): Promise<string[]> {
  return call(config, async () => {
    const ids: string[] = [];
    for await (const model of client(config).models.list()) ids.push(model.id);
    return ids;
  });
}
