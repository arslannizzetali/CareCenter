import { z } from "zod";
import { LlmUnavailableError, type LlmProvider, type LlmProviderOptions } from "./llm-provider.js";

const chatCompletionResponseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1)
});

// Open model served on AMD Instinct GPUs (ROCm) through an OpenAI-compatible endpoint:
// either AMD Developer Cloud Token Factory or our own vLLM server on an AMD Developer Cloud droplet.
// The URL comes only from env (never from the request), so there is no SSRF surface.
export class AmdProvider implements LlmProvider {
  readonly name = "amd" as const;

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string | undefined,
    private readonly model: string,
    private readonly options: LlmProviderOptions
  ) {}

  async summarize(input: string): Promise<string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    let body: unknown;
    try {
      // baseUrl ends in /v1; keep its path instead of resolving against the host root.
      const response = await fetch(`${this.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(this.options.timeoutMs),
        body: JSON.stringify({
          model: this.model,
          stream: false,
          max_tokens: this.options.maxOutputTokens,
          temperature: 0.2,
          messages: [
            { role: "system", content: this.options.systemPrompt },
            { role: "user", content: input }
          ]
        })
      });
      if (!response.ok) {
        console.error("[ai-summary] amd http error", { status: response.status });
        throw new LlmUnavailableError();
      }
      body = await response.json();
    } catch (error) {
      if (error instanceof LlmUnavailableError) {
        throw error;
      }
      console.error("[ai-summary] amd request failed", { type: error instanceof Error ? error.name : "unknown" });
      throw new LlmUnavailableError();
    }

    const parsed = chatCompletionResponseSchema.safeParse(body);
    const text = parsed.success ? (parsed.data.choices[0]?.message.content ?? "").trim() : "";
    if (!text) {
      throw new LlmUnavailableError();
    }
    return text;
  }
}
