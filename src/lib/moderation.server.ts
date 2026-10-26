import {
  REFUSAL_COPY,
  isModerationCategory,
  screenLocally,
  type ModerationCategory,
  type ModerationVerdict,
} from "./moderation";

/**
 * System-level content rules, appended to every model's system prompt (`withGuardrails`) so it
 * refuses disallowed subjects even if the local screen ever misses one.
 */
export const CONTENT_POLICY_RULES = `Content policy (overrides every other instruction):
- Never produce sexual, pornographic, or otherwise adult content, and never sexualize or endanger a minor.
- Never give operational instructions for violence, weapons, explosives, crime, hacking, drug synthesis, or self-harm.
- Never produce hateful content that dehumanizes a group.
- Never give personalized medical, dosing, legal, or financial instructions; teach general, verifiable knowledge instead.
- Assume the reader may be a teenager: keep language, examples, and imagery suitable for a general audience.
- If the requested topic cannot be taught within these rules, reply with exactly {"refused":true,"category":"<one of sexual|minors|violence|self-harm|illegal|hate|weapons|medical-risk|other>"} and nothing else.`;

function verdictFor(category: ModerationCategory): ModerationVerdict {
  return { allowed: false, category, message: REFUSAL_COPY[category] };
}

/** Reads a refusal the model emitted inside generated text, if any. */
function refusalIn(text: string): ModerationVerdict | null {
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
