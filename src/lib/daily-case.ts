import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { LESSONS } from "./curriculum";
import { dayKey, isDayKey } from "./days";
import { choiceStep, confidenceStep, stepProblems, wordCount } from "./steps/types";
import { useToday } from "./use-today";
import { arrayOf, isRecord, recordOf } from "./local-store";

/**
 * The daily case: one real-world text (an ad, a post, an email, a chatbot answer...) and three
 * questions about it, each from a different unit, so a day's practice mixes skills the way real
 * reading does. Cases are written as data in `content/cases.ts`; this module holds their format,
 * which case a learner gets on a given day, and what they've read (on this device only).
 */

export const CASE_SOURCES = {
  advert: "An ad",
  post: "A post",
  headline: "A headline",
  email: "An email",
  chatbot: "A chatbot answer",
  review: "A review",
  notice: "A notice",
  message: "A message",
  article: "An article",
  report: "A report",
  listing: "A listing",
  leaflet: "A flyer",
} as const;
export type CaseSource = keyof typeof CASE_SOURCES;

/** How long the case text may be, in words: long enough to be messy, short enough for a phone. */
export const CASE_TEXT_WORDS = { min: 40, max: 150 } as const;
export const CASE_QUESTIONS = 3;

const question = z.object({
  /** The lesson whose skill the question tests; its unit is the question's unit. */
  lessonId: z.string().min(1),
  step: z.discriminatedUnion("kind", [choiceStep, confidenceStep]),
});

export const dailyCaseSchema = z.object({
  /** `case-001`… for the written library; `ai-<day>` for a case an AI wrote for that day. */
  id: z.string().regex(/^(case-\d{3}|ai-\d{4}-\d{2}-\d{2})$/),
  source: z.enum(Object.keys(CASE_SOURCES) as [CaseSource, ...CaseSource[]]),
  title: z.string().trim().min(1).max(60),
  text: z.string().trim().min(1).max(1000),
  questions: z.array(question).length(CASE_QUESTIONS),
  takeaway: z.string().trim().min(1).max(200),
});
export type DailyCase = z.infer<typeof dailyCaseSchema>;
export type CaseQuestion = DailyCase["questions"][number];

export const unitOfLesson = (lessonId: string) => LESSONS.find((l) => l.id === lessonId)?.unitId;
export const aiCaseId = (day: string) => `ai-${day}`;
export const isAiCase = (c: DailyCase) => c.id.startsWith("ai-");
export const caseUnits = (c: DailyCase) => c.questions.map((q) => unitOfLesson(q.lessonId) ?? "");

/** Rules across fields: what is wrong with a case, in words. Empty means it is well formed. */
export function caseProblems(c: DailyCase): string[] {
  const problems: string[] = [];
  const words = wordCount(c.text);
  if (words < CASE_TEXT_WORDS.min || words > CASE_TEXT_WORDS.max)
    problems.push(`text is ${words} words; keep it ${CASE_TEXT_WORDS.min}-${CASE_TEXT_WORDS.max}`);
  const units = caseUnits(c);
  if (units.some((u) => !u)) problems.push("a question names a lesson that doesn't exist");
  if (new Set(units).size !== units.length) problems.push("two questions share a unit");
  const ids = c.questions.map((q) => q.step.id);
  if (new Set(ids).size !== ids.length) problems.push("two questions share an id");
  for (const q of c.questions) {
    if (q.step.kind === "choice" && q.step.stimulus)
      problems.push(`${q.step.id}: the case text is the stimulus; don't add another`);
    problems.push(...stepProblems(q.step).map((p) => `${q.step.id}: ${p}`));
  }
  if (wordCount(c.takeaway) > 25) problems.push("takeaway is over 25 words");
  return problems;
}

/** Case id → the local day it was last finished. */
export type CaseHistory = Record<string, string>;
export type CasePick = {
  case: DailyCase;
  /** Already finished today. */
  done: boolean;
  /** Every case has been read, so this is the one read longest ago. */
  repeat: boolean;
};

/**
 * Today's case. A case finished today stays today's case. Otherwise the next unread case in the
 * library's order, preferring the one with fewest questions from units the learner hasn't started;
 * once every case has been read, the one read longest ago comes back.
 */
export function caseForDay(
  cases: readonly DailyCase[],
  history: CaseHistory,
  studied: ReadonlySet<string>,
  day: string,
): CasePick | null {
  if (cases.length === 0) return null;
  const today = cases.find((c) => history[c.id] === day);
  if (today) return { case: today, done: true, repeat: false };

  const unread = cases.filter((c) => history[c.id] === undefined);
  if (unread.length > 0) {
    const unstudied = (c: DailyCase) => caseUnits(c).filter((u) => !studied.has(u)).length;
    const fewest = Math.min(...unread.map(unstudied));
    return { case: unread.find((c) => unstudied(c) === fewest)!, done: false, repeat: false };
  }
  const oldest = cases.reduce((a, b) => (history[b.id]! < history[a.id]! ? b : a));
  return { case: oldest, done: false, repeat: true };
}

export { caseXp } from "./progress-core";

const KEY = "lamppost-case-v1";
const EVENT = "lamppost-case-change";
/** How many finished cases are kept for the record. */
const KEEP_RESULTS = 120;
/** How many AI-written cases are kept on the device, newest first. */
const KEEP_GENERATED = 30;

export type CaseResult = { day: string; caseId: string; right: number; total: number };
export type CaseStore = {
  history: CaseHistory;
  results: CaseResult[];
  /** AI-written cases this device has been given, by id. */
  generated: Record<string, DailyCase>;
};

const usableCase = (value: unknown): DailyCase | null => {
  const parsed = dailyCaseSchema.safeParse(value);
  return parsed.success && caseProblems(parsed.data).length === 0 ? parsed.data : null;
};

export function readCaseStore(): CaseStore {
  const empty: CaseStore = { history: {}, results: [], generated: {} };
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<CaseStore>) : {};
    const generated: Record<string, DailyCase> = {};
    for (const value of Object.values(parsed.generated ?? {})) {
      const c = usableCase(value);
      if (c && isAiCase(c)) generated[c.id] = c;
    }
    return {
      history: recordOf(parsed.history, (day) => (isDayKey(day) ? day : null)),
      results: arrayOf(parsed.results, (r) =>
        isRecord(r) &&
        isDayKey(r["day"]) &&
        typeof r["caseId"] === "string" &&
        typeof r["right"] === "number" &&
        typeof r["total"] === "number"
          ? { day: r["day"], caseId: r["caseId"], right: r["right"], total: r["total"] }
          : null,
      ),
      generated,
    };
  } catch {
    return empty;
  }
}

function writeCaseStore(next: CaseStore): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    return false;
  }
}

/** Keeps an AI-written case on this device so it can be read, finished and looked at again. */
export function saveGeneratedCase(value: unknown): boolean {
  if (typeof window === "undefined") return false;
  const c = usableCase(value);
  if (!c || !isAiCase(c)) return false;
  const store = readCaseStore();
  const kept = Object.values({ ...store.generated, [c.id]: c })
    .sort((a, b) => (a.id < b.id ? 1 : -1))
    .slice(0, KEEP_GENERATED);
  return writeCaseStore({ ...store, generated: Object.fromEntries(kept.map((k) => [k.id, k])) });
}

/** Saves a finished case. Returns false, and changes nothing, if it was already finished today. */
export function recordCase(caseId: string, right: number, total: number, day = dayKey()): boolean {
  if (typeof window === "undefined") return false;
  const store = readCaseStore();
  if (store.history[caseId] === day) return false;
  return writeCaseStore({
    ...store,
    history: { ...store.history, [caseId]: day },
    results: [...store.results, { day, caseId, right, total }].slice(-KEEP_RESULTS),
  });
}

/** Units with at least one finished lesson. */
export function studiedUnits(done: ReadonlySet<number>): Set<string> {
  return new Set(LESSONS.filter((_, i) => done.has(i)).map((l) => l.unitId));
}

/**
 * Today's case from the given library plus any AI-written cases on this device, whether it's
 * done, and today's result if so. `wantsNew` is true when every case has been read, so an
 * AI-written one is worth asking for (`useAiCaseTopUp`).
 */
export function useDailyCase(cases: readonly DailyCase[], done: ReadonlySet<number>) {
  const [store, setStore] = useState<CaseStore>({ history: {}, results: [], generated: {} });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => setStore(readCaseStore());
    sync();
    setHydrated(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const today = useToday();
  const library = useMemo(
    () => [...cases, ...Object.values(store.generated).sort((a, b) => (a.id < b.id ? -1 : 1))],
    [cases, store.generated],
  );
  const pick = useMemo(
    () => caseForDay(library, store.history, studiedUnits(done), today),
    [library, store.history, done, today],
  );
  const result = [...store.results]
    .reverse()
    .find((r) => r.day === today && r.caseId === pick?.case.id);
  const record = useCallback(
    (caseId: string, right: number, total: number) => recordCase(caseId, right, total),
    [],
  );
  return {
    pick,
    result,
    read: Object.keys(store.history).length,
    wantsNew: hydrated && pick !== null && pick.repeat && !pick.done,
    hydrated,
    record,
  };
}
