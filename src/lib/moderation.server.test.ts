import { beforeEach, describe, expect, it, vi } from "vitest";

const model = vi.hoisted(() => ({ generateText: vi.fn() }));
vi.mock("ai", () => model);
vi.mock("./ai-gateway.server", () => ({ createLovableAiGatewayProvider: () => () => "model" }));

import { CHECK_UNAVAILABLE, parseTopicVerdict, screenTopicText } from "./moderation.server";

const reply = (text: string) => model.generateText.mockResolvedValue({ text });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("parseTopicVerdict", () => {
  it("lets a topic through only on an explicit allowed:true", () => {
    expect(parseTopicVerdict('{"allowed":true,"category":"none"}')).toEqual({ allowed: true });
    expect(parseTopicVerdict('Sure: {"allowed": true, "category": "none"} done')).toEqual({
      allowed: true,
    });
  });

  it("refuses with the category the classifier gave", () => {
    const verdict = parseTopicVerdict('{"allowed":false,"category":"weapons"}');
    expect(verdict).toMatchObject({ allowed: false, category: "weapons" });
    expect(verdict && !verdict.allowed && verdict.unavailable).toBeUndefined();
  });

  it("falls back to 'other' for a category it doesn't know", () => {
    expect(parseTopicVerdict('{"allowed":false,"category":"made-up"}')).toMatchObject({
      allowed: false,
      category: "other",
    });
    expect(parseTopicVerdict('{"allowed":false}')).toMatchObject({ category: "other" });
  });

  it("reads a truncated reply field by field", () => {
    expect(parseTopicVerdict('{"allowed":false,"category":"hate"')).toMatchObject({
      allowed: false,
      category: "hate",
    });
  });

  it("does not guess when the reply is unreadable or says something else", () => {
    for (const text of [
      "",
      "I think this is fine.",
      "{}",
      '{"category":"none"}',
      '{"allowed":"yes"}',
      '{"allowed":null}',
      '{"allowed":1}',
      "allowed: true",
    ]) {
      expect(parseTopicVerdict(text), text).toBeNull();
    }
  });
});

describe("screenTopicText fails closed", () => {
  it("allows a topic the classifier allows", async () => {
    reply('{"allowed":true,"category":"none"}');
    expect(await screenTopicText("Bread", "baking", "key")).toEqual({ allowed: true });
  });

  it("refuses a topic the classifier refuses, as a content refusal", async () => {
    reply('{"allowed":false,"category":"illegal"}');
    const verdict = await screenTopicText("Something", "notes", "key");
    expect(verdict).toMatchObject({ allowed: false, category: "illegal" });
    expect(verdict.allowed === false && verdict.unavailable).toBeUndefined();
  });

  it("does not let a topic through when there is no key to check it with", async () => {
    const verdict = await screenTopicText("Bread", "baking", undefined);
    expect(verdict).toMatchObject({
      allowed: false,
      unavailable: true,
      message: CHECK_UNAVAILABLE,
    });
    expect(model.generateText).not.toHaveBeenCalled();
  });

  it("does not let a topic through when the classifier errors", async () => {
    model.generateText.mockRejectedValue(new Error("502 bad gateway"));
    expect(await screenTopicText("Bread", "baking", "key")).toMatchObject({
      allowed: false,
      unavailable: true,
    });
  });

  it("does not let a topic through when the classifier's reply is unreadable", async () => {
    for (const text of ["", "Looks fine to me!", '{"note":"ok"}']) {
      reply(text);
      expect(await screenTopicText("Bread", "baking", "key"), text).toMatchObject({
        allowed: false,
        unavailable: true,
      });
    }
  });

  it("says the check is unavailable in plain words, without blaming the topic", async () => {
    const verdict = await screenTopicText("Bread", "baking", undefined);
    expect(verdict.allowed === false && verdict.message).toMatch(/temporarily unavailable/i);
    expect(verdict.allowed === false && verdict.message).not.toMatch(/content rules/i);
  });

  it("refuses obvious cases locally without spending a model call", async () => {
    const verdict = await screenTopicText("porn", "", "key");
    expect(verdict).toMatchObject({ allowed: false, category: "sexual" });
    expect(model.generateText).not.toHaveBeenCalled();
  });

  it("has nothing to check when there is no text at all", async () => {
    expect(await screenTopicText("", "  ", "key")).toEqual({ allowed: true });
    expect(model.generateText).not.toHaveBeenCalled();
  });
});
