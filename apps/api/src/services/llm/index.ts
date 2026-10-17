import { env } from "../../config/index.js";
import { AmdProvider } from "./amd.provider.js";
import { ClaudeProvider } from "./claude.provider.js";
import { LlmDisabledError, LlmUnavailableError, type LlmProvider, type LlmProviderOptions } from "./llm-provider.js";
import { OllamaProvider } from "./ollama.provider.js";

export * from "./llm-provider.js";
export { AmdProvider } from "./amd.provider.js";
export { ClaudeProvider } from "./claude.provider.js";
export { OllamaProvider } from "./ollama.provider.js";

/** Builds the provider selected by LLM_PROVIDER. Throws 503 when LLM_ENABLED=false. */
export function createLlmProvider(options: LlmProviderOptions): LlmProvider {
  if (!env.LLM_ENABLED) {
    throw new LlmDisabledError();
  }

  if (env.LLM_PROVIDER === "claude") {
    if (!env.ANTHROPIC_API_KEY) {
      console.error("[ai-summary] LLM_PROVIDER=claude but ANTHROPIC_API_KEY is not set");
      throw new LlmUnavailableError();
    }
    return new ClaudeProvider(env.ANTHROPIC_API_KEY, options);
  }

  if (env.LLM_PROVIDER === "amd") {
    if (!env.AMD_LLM_URL) {
      console.error("[ai-summary] LLM_PROVIDER=amd but AMD_LLM_URL is not set");
      throw new LlmUnavailableError();
    }
    return new AmdProvider(env.AMD_LLM_URL, env.AMD_LLM_API_KEY, env.AMD_LLM_MODEL, options);
  }

  return new OllamaProvider(env.OLLAMA_URL, env.OLLAMA_MODEL, options);
}
