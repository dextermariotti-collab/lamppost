/**
 * Rate-limit policy for the endpoints that spend AI credit. Pure and shared:
 * the numbers live here, the database counts (see rate-limit.server.ts and the
 * rate_limits migration).
 *
 * Every limit is a fixed window. The numbers are deliberately generous for a real
 * learner — a whole lesson uses one or two gradings and a handful of follow-ups —
 * and exist to cap what a script can spend. Signed-in users get more room than
 * guests, and the last check on every policy is a shared budget for the whole app.
 */

export type LimitTier = { name: "minute" | "hour" | "day"; seconds: number; max: number };

export type LimitPolicy = {
  /** What the learner is told they've used a lot of ("written-answer grading"). */
  label: string;
  /** Applied per network key when nobody is signed in. */
  guest: readonly LimitTier[];
  /** Applied per account when signed in. */
  user: readonly LimitTier[];
  /** Backstop per network key for everyone (shared networks: schools, offices). */
  ip: readonly LimitTier[];
  /** One shared budget across the whole app; the last line of defence for cost. */
  global: readonly LimitTier[];
};

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86_400;
const t = (name: LimitTier["name"], max: number): LimitTier => ({
  name,
  seconds: name === "minute" ? MINUTE : name === "hour" ? HOUR : DAY,
  max,
});

export const POLICIES = {
  /** Grading a written answer (an AI call per submission). */
  grading: {
    label: "written-answer grading",
    guest: [t("hour", 8), t("day", 24)],
    user: [t("minute", 4), t("hour", 20), t("day", 80)],
    ip: [t("hour", 60)],
    global: [t("day", 4000)],
  },
  /** The companion's Socratic follow-ups. */
  socratic: {
    label: "companion follow-ups",
    guest: [t("minute", 6), t("hour", 40), t("day", 120)],
    user: [t("minute", 10), t("hour", 80), t("day", 300)],
    ip: [t("hour", 200)],
    global: [t("day", 20_000)],
  },
  /** Generating a lesson that is not cached yet. Cached lessons are never limited. */
  lessonGeneration: {
    label: "new lesson preparation",
    guest: [t("hour", 6), t("day", 12)],
    user: [t("hour", 12), t("day", 30)],
    ip: [t("hour", 30)],
    global: [t("hour", 40), t("day", 150)],
  },
  /**
   * Writing one part of a lesson that isn't cached yet (the idea card, a drill, the
   * written task). A whole lesson is six or seven of these, so the numbers allow a
   * few lessons an hour per caller. Parts already written are read, never counted.
   */
  lessonPart: {
    label: "new lesson preparation",
    guest: [t("hour", 40), t("day", 120)],
    user: [t("hour", 80), t("day", 240)],
    ip: [t("hour", 150)],
    global: [t("hour", 300), t("day", 1500)],
  },
  /** Topping up the shared drill pool in the background. */
  poolTopUp: {
    label: "new practice drills",
    guest: [t("hour", 6), t("day", 20)],
    user: [t("hour", 12), t("day", 60)],
    ip: [t("hour", 30)],
    global: [t("hour", 60), t("day", 300)],
  },
  /** Open-ended course generation. The app no longer has a screen for it. */
  topicGeneration: {
    label: "course creation",
    guest: [t("day", 3)],
    user: [t("hour", 3), t("day", 8)],
    ip: [t("day", 10)],
    global: [t("day", 100)],
  },
  /** The "explain it back" tutor. Signed-in only. */
  practiceTurn: {
    label: "practice chat",
    guest: [],
    user: [t("minute", 6), t("hour", 60), t("day", 200)],
    ip: [t("hour", 200)],
    global: [t("day", 10_000)],
  },
  /** Writing a debate motion (a generation per challenge). Signed-in only. */
  debateMotion: {
    label: "new debates",
    guest: [],
    user: [t("hour", 6), t("day", 15)],
    ip: [t("hour", 40)],
    global: [t("day", 1000)],
  },
  /** Grading a debate answer. Signed-in only. */
  debateGrade: {
    label: "debate grading",
    guest: [],
    user: [t("hour", 12), t("day", 30)],
    ip: [t("hour", 60)],
    global: [t("day", 2000)],
  },
  /** Opening the friends league (which settles the last week the first time). Signed-in only. */
  leagueView: {
    label: "league views",
    guest: [],
    user: [t("minute", 20), t("hour", 200)],
    ip: [t("hour", 600)],
    global: [],
  },
  /** Recording that someone accepted the terms and gave an age band. Signed-in only. */
  consent: {
    label: "sign-up confirmations",
    guest: [],
    user: [t("hour", 10), t("day", 30)],
    ip: [t("hour", 120)],
    global: [],
  },
  /** Blocking, unblocking and reporting people. Signed-in only. */
  safety: {
    label: "safety actions",
    guest: [],
    user: [t("minute", 10), t("hour", 60)],
    ip: [t("hour", 240)],
    global: [],
  },
} as const satisfies Record<string, LimitPolicy>;

export type PolicyName = keyof typeof POLICIES;

export type Identity = { userId: string | null; ipKey: string };

/** One counter the database increments: the shape check_rate_limits() takes. */
export type Check = {
  bucket: string;
  key: string;
  tier: string;
  window_seconds: number;
  max: number;
};

export type LimitScope = "guest" | "user" | "ip" | "global" | "unavailable";

/**
 * What a refused call returns to the browser: a normal failure (`ok: false`) with
 * a message the learner can read and a flag the UI can key off, so it can stop
 * retrying and say when to come back.
 */
export type LimitedFailure = {
  ok: false;
  reason: string;
  limited: true;
  retryAfterSeconds: number;
};

export const limitedFailure = (verdict: {
  message: string;
  retryAfterSeconds: number;
}): LimitedFailure => ({
  ok: false,
  reason: verdict.message,
  limited: true,
  retryAfterSeconds: verdict.retryAfterSeconds,
});

/** True for a result the server refused because a limit was reached. */
export const isLimited = (result: { ok: boolean }): result is LimitedFailure =>
  !result.ok && (result as Partial<LimitedFailure>).limited === true;

const asChecks = (
  bucket: string,
  key: string,
  scope: "guest" | "user" | "ip" | "global",
  tiers: readonly LimitTier[],
): Check[] =>
  tiers.map((tier) => ({
    bucket,
    key,
    tier: `${scope}-${tier.name}`,
    window_seconds: tier.seconds,
    max: tier.max,
  }));

/**
 * The counters one request must pass, in the order the database should count
 * them: the caller's own limits first, the shared budget last (so a refused
 * caller can't drain the shared budget by hammering).
 */
export function checksFor(policyName: PolicyName, identity: Identity): Check[] {
  const policy: LimitPolicy = POLICIES[policyName];
  const own = identity.userId
    ? [
        ...asChecks(policyName, `u:${identity.userId}`, "user", policy.user),
        ...asChecks(policyName, identity.ipKey, "ip", policy.ip),
      ]
    : asChecks(policyName, identity.ipKey, "guest", policy.guest);
  return [...own, ...asChecks(policyName, "all", "global", policy.global)];
}

/** Whether a policy is available to someone who is not signed in. */
export const allowsGuests = (policyName: PolicyName) =>
  (POLICIES[policyName] as LimitPolicy).guest.length > 0;

export function scopeOf(tier: string | null): LimitScope {
  const scope = tier?.split("-")[0];
  return scope === "user" || scope === "guest" || scope === "global" ? scope : "ip";
}

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6 = /^[0-9a-f:.]{2,45}$/i;

/**
 * The caller's network address. The platform's own header wins; a caller-set
 * X-Forwarded-For is only used when nothing better exists (on a host that
 * doesn't overwrite it, a caller could vary it — see the PR notes).
 */
export function clientIp(headers: { get(name: string): string | null }): string | null {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
  ];
  for (const raw of candidates) {
    const value = raw?.trim();
    if (value && (IPV4.test(value) || (value.includes(":") && IPV6.test(value)))) return value;
  }
  return null;
}

export function formatWait(seconds: number): string {
  if (seconds <= 10) return "a few seconds";
  if (seconds < 45) return "less than a minute";
  if (seconds < 90) return "about a minute";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `about ${minutes} minutes`;
  if (minutes < 90) return "about an hour";
  const hours = Math.round(seconds / 3600);
  if (hours < 24) return `about ${hours} hours`;
  return "tomorrow";
}

/** What the learner reads when a limit stops them. Calm, specific, no blame for shared load. */
export function limitMessage(policyName: PolicyName, scope: LimitScope, seconds: number): string {
  const label = (POLICIES[policyName] as LimitPolicy).label;
  if (scope === "unavailable") {
    return `Lamppost's ${label} is temporarily unavailable. Please try again in a moment.`;
  }
  if (scope === "global") {
    return `Lamppost's ${label} is very busy right now. Please try again in ${formatWait(seconds)}.`;
  }
  return `You've used a lot of ${label} in a short time. Please try again in ${formatWait(seconds)}.`;
}
