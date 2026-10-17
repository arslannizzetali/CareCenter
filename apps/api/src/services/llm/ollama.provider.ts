import { z } from "zod";
import { LlmUnavailableError, type LlmProvider, type LlmProviderOptions } from "./llm-provider.js";

const ollamaChatResponseSchema = z.object({
  message: z.object({ content: z.string() })
});

// Intranet scenario: model runs on a local Ollama server, data never leaves the network.
// The URL comes only from env (never from the request), so there is no SSRF surface.
export class OllamaProvider implements LlmProvider {
  readonly name = "ollama" as const;

  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly options: LlmProviderOptions
  ) {}

  async summarize(input: string): Promise<string> {
    let body: unknown;
    try {
      const response = await fetch(new URL("/api/chat", this.baseUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(this.options.timeoutMs),
        body: JSON.stringify({
          model: this.model,
          stream: false,
          options: { num_predict: this.options.maxOutputTokens, temperature: 0.2 },
          messages: [
            { role: "system", content: this.options.systemPrompt },
            { role: "user", content: input }
          ]
        })
      });
      if (!response.ok) {
        console.error("[ai-summary] ollama http error", { status: response.status });
        throw new LlmUnavailableError();
      }
      body = await response.json();
    } catch (error) {
      if (error instanceof LlmUnavailableError) {
        throw error;
      }
      console.error("[ai-summary] ollama request failed", { type: error instanceof Error ? error.name : "unknown" });
      throw new LlmUnavailableError();
    }

    const parsed = ollamaChatResponseSchema.safeParse(body);
    const text = parsed.success ? parsed.data.message.content.trim() : "";
    if (!text) {
      throw new LlmUnavailableError();
    }
    return text;
  }
}
