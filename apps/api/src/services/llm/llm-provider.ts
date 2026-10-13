import { AppError } from "../../utils/errors.js";

export type LlmProviderName = "claude" | "ollama";

export interface LlmProvider {
  readonly name: LlmProviderName;
  summarize(input: string): Promise<string>;
}

export interface LlmProviderOptions {
  systemPrompt: string;
  timeoutMs: number;
  maxOutputTokens: number;
}

export class LlmDisabledError extends AppError {
  constructor() {
    super(503, "AI_DISABLED", "The AI feature is disabled");
  }
}

// Upstream error text (SDK / Ollama) is never forwarded to the client: it can echo
// request details. Only a generic Turkish message leaves the API.
export class LlmUnavailableError extends AppError {
  constructor() {
    super(502, "AI_UNAVAILABLE", "The summary could not be generated right now. Please try again shortly.");
  }
}
