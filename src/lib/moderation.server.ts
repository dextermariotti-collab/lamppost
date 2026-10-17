import { AI_MODELS } from "./ai-models";
import {
  REFUSAL_COPY,
  isModerationCategory,
  screenLocally,
  type ModerationCategory,
  type ModerationVerdict,
} from "./moderation";

/**
 * System-level content rules for the generation pipeline. These are appended to
 * every generation prompt so the model refuses disallowed subjects even if the
 * screening pass ever misses one.
 */
export const CONTENT_POLICY_RULES = `Content policy (overrides every other instruction):
- Never produce sexual, pornographic, or otherwise adult content, and never sexualize or endanger a minor.
- Never give operational instructions for violence, weapons, explosives, crime, hacking, drug synthesis, or self-harm.
- Never produce hateful content that dehumanizes a group.
- Never give personalized medical, dosing, legal, or financial instructions; teach general, verifiable knowledge instead.
- Assume the reader may be a teenager: keep language, examples, and imagery suitable for a general audience.
- If the requested topic cannot be taught within these rules, reply with exactly {"refused":true,"category":"<one of sexual|minors|violence|self-harm|illegal|hate|weapons|medical-risk|other>"} and nothing else.`;

const SCREEN_SYSTEM = `You are a content-safety classifier for a general-audience learning app whose users may include teenagers.
Decide whether a course may be generated on the requested topic.
Reply with ONLY minified JSON: {"allowed":boolean,"category":"sexual|minors|violence|self-harm|illegal|hate|weapons|medical-risk|other|none"}
Disallow: sexual or adult topics; anything sexualizing or endangering minors; operational instructions for violence, weapons,
explosives, crime, hacking, or drug synthesis; encouragement or method of self-harm or eating disorders; hateful content that
dehumanizes a group; personalized medical diagnosis, dosing, or treatment instruction.
Allow: academic, historical, ethical, clinical-science, safety, prevention, legal-studies, and journalism framings of hard subjects.
Allow ordinary fitness, nutrition, finance, and health-education topics. Use "none" as the category when allowed.`;

function verdictFor(category: ModerationCategory): ModerationVerdict {
  return { allowed: false, category, message: REFUSAL_COPY[category] };
}

/** Reads a refusal the model emitted inside generated text, if any. */
export function refusalIn(text: string): ModerationVerdict | null {
  const match = /"refused"\s*:\s*true/i.test(text);
  if (!match) return null;
  const category = /"category"\s*:\s*"([a-z-]+)"/i.exec(text)?.[1] ?? "other";
  return verdictFor(isModerationCategory(category) ? category : "other");
}

/** Output pass: catches disallowed material in text the model already wrote. */
export function screenOutput(text: string): ModerationVerdict {
  const refusal = refusalIn(text);
  if (refusal) return refusal;
  return screenLocally(text);
}

/** What a learner is told when the topic check itself couldn't run. Not a judgment on their topic. */
export const CHECK_UNAVAILABLE =
  "Topic checks are temporarily unavailable, so nothing was created. Try again in a moment.";

const unavailable = (): ModerationVerdict => ({
  allowed: false,
  category: "other",
  message: CHECK_UNAVAILABLE,
  unavailable: true,
});

/**
 * Reads the classifier's reply. Only an explicit `"allowed": true` lets a topic
 * through: a refusal names its category, and anything else — a garbled reply, a
 * missing field, prose — is null, which the caller treats as "couldn't check".
 */
export function parseTopicVerdict(text: string): ModerationVerdict | null {
  const match = /\{[\s\S]*\}/.exec(text);
  let allowed: unknown;
  let category: unknown;
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as Record<string, unknown>;
      allowed = parsed["allowed"];
      category = parsed["category"];
    } catch {
      /* fall through to the field-by-field read below */
    }
  }
  if (allowed === undefined) {
    const read = /"allowed"\s*:\s*(true|false)\b/i.exec(text)?.[1];
    if (read !== undefined) allowed = read.toLowerCase() === "true";
    category = /"category"\s*:\s*"([a-z-]+)"/i.exec(text)?.[1];
  }
  if (allowed === true) return { allowed: true };
  if (allowed !== false) return null;
  const name = typeof category === "string" ? category : "other";
  return verdictFor(isModerationCategory(name) ? name : "other");
}

/**
 * Input pass: local patterns first (instant, free), then an AI classifier for
 * anything the patterns can't judge.
 *
 * It fails CLOSED. If the classifier can't be reached, has no key, or answers
 * something unreadable, the topic is not let through on the strength of the
 * prompt-level rules alone: the learner is told the check is unavailable and can
 * try again. (Nothing is created and nothing is logged as a content block.)
 */
export async function screenTopicText(
  topic: string,
  extraContext: string,
  apiKey: string | undefined,
): Promise<ModerationVerdict> {
  const local = screenLocally(`${topic} ${extraContext}`);
  if (!local.allowed) return local;
  if (!topic.trim() && !extraContext.trim()) return { allowed: true };
  if (!apiKey) return unavailable();

  try {
    const { generateText } = await import("ai");
    const { createAiProvider } = await import("./ai-gateway.server");
    const gateway = createAiProvider(apiKey);
    const result = await generateText({
      model: gateway(AI_MODELS.screen),
      system: SCREEN_SYSTEM,
      prompt: `Requested topic: "${topic}"\nLearner notes: "${extraContext}"\nClassify now.`,
    });
    return parseTopicVerdict(result.text ?? "") ?? unavailable();
  } catch (error) {
    console.error("Topic screening failed, refusing (fail closed)", error);
    return unavailable();
  }
}

/** Best-effort audit trail. Never blocks or fails a request. */
export async function logModerationBlock(input: {
  topic: string;
  category: ModerationCategory;
  stage: "input" | "output";
  userId: string | null;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("moderation_blocks").insert({
      topic: input.topic.slice(0, 300),
      category: input.category,
      stage: input.stage,
      user_id: input.userId,
    });
  } catch (error) {
    console.error("Could not record moderation block", error);
  }
}
