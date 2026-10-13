import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Google's OpenAI-compatible endpoint for Gemini, which serves the models named in
 * `ai-models.ts`. Any OpenAI-compatible service can be used instead by setting AI_BASE_URL
 * (and naming its models in `ai-models.ts`).
 */
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

/** The provider every model call goes through. `apiKey` is the server's AI_API_KEY. */
export function createAiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "ai",
    baseURL: process.env["AI_BASE_URL"] || DEFAULT_BASE_URL,
    apiKey,
  });
}
