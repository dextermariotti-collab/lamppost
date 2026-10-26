import { generateText } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AI_MODELS, AI_REPLY_TOKENS, THINKING_TOKENS, aiOutput } from "./ai-models";
import { createAiProvider } from "./ai-gateway.server";

/** What the provider sends: the request a real AI service would receive. */
const reply = {
  id: "r1",
  object: "chat.completion",
  created: 0,
  model: AI_MODELS.look,
  choices: [{ index: 0, message: { role: "assistant", content: "ok" }, finish_reason: "stop" }],
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
};

const capture = () => {
  const fetch = vi.fn(
    async (_url: string, _init: RequestInit) =>
      new Response(JSON.stringify(reply), { headers: { "content-type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env["AI_BASE_URL"];
});

describe("the AI provider", () => {
  it("calls Google's Gemini endpoint with the key as a bearer token and the model by name", async () => {
    const fetch = capture();
    const result = await generateText({
      model: createAiProvider("test-key")(AI_MODELS.look),
      prompt: "Hello",
    });
    expect(result.text).toBe("ok");
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    );
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer test-key");
    expect(JSON.parse(String(init.body))).toMatchObject({ model: AI_MODELS.look });
  });

  it("sends each call's output cap and a low reasoning effort", async () => {
    const fetch = capture();
    await generateText({
      model: createAiProvider("k")(AI_MODELS.look),
      prompt: "Hello",
      ...aiOutput("look"),
    });
    expect(JSON.parse(String(fetch.mock.calls[0]![1].body))).toMatchObject({
      max_tokens: AI_REPLY_TOKENS.look + THINKING_TOKENS,
      reasoning_effort: "low",
    });
  });

  it("can be pointed at another OpenAI-compatible service", async () => {
    process.env["AI_BASE_URL"] = "https://example.test/v1";
    const fetch = capture();
    await generateText({ model: createAiProvider("k")(AI_MODELS.look), prompt: "Hello" });
    expect(String(fetch.mock.calls[0]![0])).toBe("https://example.test/v1/chat/completions");
  });
});

describe("the models and their caps", () => {
  it("name models the AI service still serves", () => {
    expect(AI_MODELS.tutor).toBe("gemini-3.8-flash");
    expect(AI_MODELS.grading).toBe("gemini-3.6-flash");
  });

  it("give the longer jobs more room than the one-liners", () => {
    expect(AI_REPLY_TOKENS.caseWriter).toBeGreaterThan(AI_REPLY_TOKENS.caseReview);
    expect(AI_REPLY_TOKENS.caseReview).toBeLessThan(AI_REPLY_TOKENS.tutor);
    for (const tokens of Object.values(AI_REPLY_TOKENS)) {
      expect(tokens).toBeGreaterThan(0);
      expect(tokens + THINKING_TOKENS).toBeLessThanOrEqual(10_000);
    }
  });
});
