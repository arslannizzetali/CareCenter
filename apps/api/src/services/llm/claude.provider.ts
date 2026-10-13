import Anthropic from "@anthropic-ai/sdk";
import { LlmUnavailableError, type LlmProvider, type LlmProviderOptions } from "./llm-provider.js";

const MODEL = "claude-opus-5-5";

export class ClaudeProvider implements LlmProvider {
  readonly name = "claude" as const;
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly options: LlmProviderOptions
  ) {
    this.client = new Anthropic({ apiKey, timeout: options.timeoutMs, maxRetries: 1 });
  }

  async summarize(input: string): Promise<string> {
    let response: Anthropic.Beta.BetaMessage;
    try {
      response = await this.client.beta.messages.create({
        model: MODEL,
        max_tokens: this.options.maxOutputTokens,
        output_config: { effort: "low" },
        // On a safety decline the API retries the same request on a fallback Claude model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: this.options.systemPrompt,
        messages: [{ role: "user", content: input }]
      });
    } catch (error) {
      logProviderError(error);
      throw new LlmUnavailableError();
    }

    if (response.stop_reason === "refusal") {
      console.error("[ai-summary] claude refusal", { category: response.stop_details?.category ?? null });
      throw new LlmUnavailableError();
    }

    const text = response.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!text) {
      throw new LlmUnavailableError();
    }
    return text;
  }
}

// Logs only the error class and HTTP status — never the message body, prompt or key.
function logProviderError(error: unknown): void {
  if (error instanceof Anthropic.APIError) {
    console.error("[ai-summary] claude api error", { type: error.constructor.name, status: error.status ?? null });
    return;
  }
  console.error("[ai-summary] claude request failed", { type: error instanceof Error ? error.name : "unknown" });
}
