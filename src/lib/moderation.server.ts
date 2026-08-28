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
- Never produce sexual, pornographic, or otherwise adult content, and never sexualise or endanger a minor.
- Never give operational instructions for violence, weapons, explosives, crime, hacking, drug synthesis, or self-harm.
- Never produce hateful content that dehumanises a group.
- Never give personalised medical, dosing, legal, or financial instructions; teach general, verifiable knowledge instead.
- Assume the reader may be a teenager: keep language, examples, and imagery suitable for a general audience.
- If the requested topic cannot be taught within these rules, reply with exactly {"refused":true,"category":"<one of sexual|minors|violence|self-harm|illegal|hate|weapons|medical-risk|other>"} and nothing else.`;

const SCREEN_SYSTEM = `You are a content-safety classifier for a general-audience learning app whose users may include teenagers.
Decide whether a course may be generated on the requested topic.
Reply with ONLY minified JSON: {"allowed":boolean,"category":"sexual|minors|violence|self-harm|illegal|hate|weapons|medical-risk|other|none"}
Disallow: sexual or adult topics; anything sexualising or endangering minors; operational instructions for violence, weapons,
explosives, crime, hacking, or drug synthesis; encouragement or method of self-harm or eating disorders; hateful content that
dehumanises a group; personalised medical diagnosis, dosing, or treatment instruction.
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

/**
 * Input pass: local patterns first (instant, free), then an AI classifier for
 * anything the patterns can't judge. Falls back to "allowed" only when the
 * classifier is unreachable, since the local pass already caught the explicit
 * cases and the generation prompt still carries CONTENT_POLICY_RULES.
 */
export async function screenTopicText(
  topic: string,
  extraContext: string,
  apiKey: string | undefined,
): Promise<ModerationVerdict> {
  const local = screenLocally(`${topic} ${extraContext}`);
  if (!local.allowed) return local;
  if (!apiKey || !topic.trim()) return { allowed: true };

  try {
    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);
    const result = await generateText({
      model: gateway("google/gemini-3.6-flash-lite"),
      system: SCREEN_SYSTEM,
      prompt: `Requested topic: "${topic}"\nLearner notes: "${extraContext}"\nClassify now.`,
    });
    const text = result.text ?? "";
    const allowed = !/"allowed"\s*:\s*false/i.test(text);
    if (allowed) return { allowed: true };
    const category = /"category"\s*:\s*"([a-z-]+)"/i.exec(text)?.[1] ?? "other";
    return verdictFor(isModerationCategory(category) ? category : "other");
  } catch (error) {
    console.error("Topic screening failed, falling back to prompt-level rules", error);
    return { allowed: true };
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
