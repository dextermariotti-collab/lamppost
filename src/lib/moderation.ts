/**
 * Shared, client-safe moderation vocabulary for the course generator.
 *
 * The generation pipeline itself is the exposure surface: a learner can type any
 * topic, so guardrails live on the input (before a course exists) and on the
 * output (before a course is shown). Nothing here is legal advice — see
 * `src/lib/legal.ts` for the user-facing policies.
 */

export type ModerationCategory =
  | "sexual"
  | "minors"
  | "violence"
  | "self-harm"
  | "illegal"
  | "hate"
  | "weapons"
  | "medical-risk"
  | "other";

export type ModerationVerdict =
  | { allowed: true }
  | {
      allowed: false;
      category: ModerationCategory;
      message: string;
      /** Set when nothing was wrong with the text: the check itself couldn't run. */
      unavailable?: true;
    };

/** Reasons a learner sees when a topic is refused. Kept calm and non-judgemental. */
export const REFUSAL_COPY: Record<ModerationCategory, string> = {
  sexual:
    "Lamppost doesn't create sexual or adult courses. Try a different topic and we'll get straight to work.",
  minors:
    "Lamppost can't create this course. Requests that sexualize or endanger minors are never generated, and repeated attempts can close your account.",
  violence:
    "Lamppost doesn't create courses that teach how to hurt people. If you want the history, ethics or prevention side of this subject, rephrase it that way.",
  "self-harm":
    "Lamppost can't build a course on this. If you're struggling, please talk to someone you trust or a local crisis line — you deserve real support, not a lesson plan.",
  illegal:
    "Lamppost doesn't create courses that teach how to commit crimes. A course on the law, history or investigation side of this is fine.",
  hate: "Lamppost doesn't create courses that attack or dehumanize people. Try a topic that doesn't target a group.",
  weapons:
    "Lamppost doesn't create courses about making weapons, explosives or other tools designed to cause harm.",
  "medical-risk":
    "Lamppost can't write a course that acts as personal medical, dosing or treatment instruction. Ask for the general science instead, and talk to a clinician about your own care.",
  other:
    "Lamppost couldn't build a course on this topic under its content rules. Try rephrasing it, or pick another subject.",
};

/**
 * Fast local screen. This is a first pass only — the AI screen in
 * `moderation.server.ts` is what actually decides borderline cases.
 */
const PATTERNS: Array<{ category: ModerationCategory; test: RegExp }> = [
  {
    category: "minors",
    test: /\b(child|children|kid|kids|minor|minors|teen|teens|underage|preteen|loli|shota)\b[^.]{0,40}\b(porn|sex|sexual|sexy|nude|nudes|erotic|fetish|grooming|seduce)\b|\b(porn|sex|sexual|nude|erotic|fetish|grooming)\b[^.]{0,40}\b(child|children|kid|kids|minor|minors|teen|teens|underage)\b/i,
  },
  {
    category: "sexual",
    test: /\b(porn|pornograph\w*|erotica|erotic|sex position\w*|sexting|hentai|nsfw|onlyfans|escort service|strip ?tease|blowjob|masturbat\w*|bdsm|fetish|orgy|incest|bestiality)\b/i,
  },
  {
    category: "weapons",
    test: /\b(build|make|making|manufactur\w*|construct|3d ?print|assemble|synthesi\w*)\b[^.]{0,40}\b(bomb|explosive\w*|pipe bomb|ied|napalm|thermite|nerve agent|sarin|ghost gun|silencer|suppressor|automatic weapon|machine gun|gun)\b|\b(bomb|explosive)\s+(making|recipe|instructions)\b/i,
  },
  {
    category: "violence",
    test: /\b(how to)\b[^.]{0,40}\b(kill|murder|assassinate|torture|kidnap|stab|shoot someone|hurt someone|poison someone)\b|\b(mass shooting|school shooting|terror(ist)? attack)\b[^.]{0,30}\b(plan|planning|guide|how)\b/i,
  },
  {
    category: "self-harm",
    test: /\b(how to|best way to|ways to|guide to)\b[^.]{0,30}\b(kill myself|commit suicide|suicide|self ?harm|cut myself|starve myself|hang myself|overdose)\b|\bpro ?(ana|mia)\b|\bthinspo\b/i,
  },
  {
    category: "illegal",
    test: /\b(how to|guide to|tutorial)\b[^.]{0,40}\b(cook meth|make meth|synthesize (meth|fentanyl|mdma|lsd|cocaine)|launder money|hack (into|someone|a bank)|steal (a car|credit cards|identities)|counterfeit (money|cash|bills)|traffic(king)? (drugs|people)|evade taxes|carding|phish\w*|ransomware|keylogger|ddos)\b/i,
  },
  {
    category: "hate",
    test: /\b(why|proof that|prove)\b[^.]{0,30}\b(are inferior|are subhuman|should be exterminated|should be eradicated)\b|\b(white|racial) supremac\w*\b[^.]{0,25}\b(guide|manifesto|recruit\w*)\b|\bholocaust denial\b|\bethnic cleansing\b[^.]{0,25}\bhow\b/i,
  },
  {
    category: "medical-risk",
    test: /\b(dose|dosage|dosing|how much)\b[^.]{0,40}\b(insulin|fentanyl|oxycodone|xanax|adderall|ketamine|steroids?|tren(bolone)?|chemotherapy)\b[^.]{0,30}\b(for me|to take|myself)\b|\b(self|home)[- ]?(surgery|abortion|amputat\w*|anesthesia)\b|\b(diagnose|treat|cure)\b[^.]{0,20}\bmy (own )?(cancer|tumor|infection|depression)\b/i,
  },
];

/** Returns a verdict from the local pattern pass. Never throws. */
export function screenLocally(text: string): ModerationVerdict {
  const value = (text ?? "").toLowerCase();
  if (!value.trim()) return { allowed: true };
  for (const { category, test } of PATTERNS) {
    if (test.test(value)) {
      return { allowed: false, category, message: REFUSAL_COPY[category] };
    }
  }
  return { allowed: true };
}

export function isModerationCategory(value: string): value is ModerationCategory {
  return value in REFUSAL_COPY;
}
