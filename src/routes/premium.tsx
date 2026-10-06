import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useSessionUser } from "@/lib/companion-store";
import { TOTAL_LESSONS } from "@/lib/curriculum";
import { FREE_WEEKLY_PRACTICE } from "@/lib/practice";
import { getPracticeAccess, type PracticeAccess } from "@/lib/practice.functions";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "Lamppost Practice — unlimited explain-it-back sessions" },
      {
        name: "description",
        content:
          "Lamppost Practice unlocks unlimited active-practice conversations: explain each lesson back in your own words and get feedback on your reasoning.",
      },
      { property: "og:title", content: "Lamppost Practice — learn by explaining" },
      {
        property: "og:description",
        content: "Unlimited explain-it-back sessions with your companion after every lesson.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/premium" }],
  }),
  component: PremiumScreen,
});

const FREE = [
  `All ${TOTAL_LESSONS} lessons in the course`,
  "Every drill and review",
  `${FREE_WEEKLY_PRACTICE} practice sessions each week`,
  "Streaks, the friends league and your companion",
];

const PAID = [
  "Unlimited explain-it-back sessions",
  "Written feedback from an AI tutor on your own explanation (AI can make mistakes)",
  "Follow-up questions that ask you to connect ideas from earlier lessons",
];

function PremiumScreen() {
  const { userId } = useSessionUser();
  const fetchAccess = useServerFn(getPracticeAccess);
  const [access, setAccess] = useState<PracticeAccess | null>(null);

  useEffect(() => {
    if (!userId) return;
    void fetchAccess({})
      .then(setAccess)
      .catch(() => undefined);
  }, [userId, fetchAccess]);

  const subscribed = access?.subscribed ?? false;

  return (
    <PhoneFrame>
      <ScreenHeader backTo="/" />
      <div className="px-5 pb-10">
        <div className="relative mt-2 text-center">
          <span
            aria-hidden="true"
            className="lamplight-glow absolute -inset-10 -z-10 rounded-full"
          />
          <p className="inline-flex items-center gap-1.5 rounded-sm bg-primary-soft px-3 py-1.5 text-[11px] font-semibold text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Lamppost Practice
          </p>
          <h1 className="mt-4 text-3xl leading-tight">Learn by explaining.</h1>
          <p className="mx-auto mt-3 max-w-72 text-sm leading-relaxed text-muted-foreground">
            After each lesson, your companion asks you to explain it back in your own words — and
            responds to what you actually said. Explaining an idea in your own words is one way to
            find out what you have really understood.
          </p>
        </div>

        <section className="mt-6 rounded-3xl bg-card p-5 shadow-card">
          <p className="text-[11px] font-semibold text-muted-foreground">Always free</p>
          <ul className="mt-3 space-y-2">
            {FREE.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm font-semibold">
                <Check className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-success/15 p-0.5 text-success" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Lessons and reviews are free. Practice adds the tutor conversation.
          </p>
        </section>

        <section className="mt-4 rounded-3xl border-2 border-primary/40 bg-primary-soft p-5">
          <p className="text-[11px] font-semibold text-primary-text">With Practice</p>
          <ul className="mt-3 space-y-2">
            {PAID.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm font-semibold text-accent-foreground"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-primary/20 p-0.5 text-primary-text" />
                {item}
              </li>
            ))}
          </ul>

          {subscribed ? (
            <div className="mt-4 rounded-2xl bg-background/70 p-3 text-center">
              <p className="text-sm font-semibold text-primary-text">Practice is active</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Thank you for supporting Lamppost.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
              Practice isn&apos;t on sale yet. Nothing has been charged, and the free features stay
              free.
            </p>
          )}
        </section>

        {access && !subscribed && (
          <p className="mt-4 text-center text-xs font-bold text-muted-foreground">
            You have {access.remaining} of {access.freeAllowance} free sessions left this week.
          </p>
        )}

        {!userId && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/auth" className="font-bold text-primary-text">
              Sign in
            </Link>{" "}
            to use your free weekly sessions.
          </p>
        )}
      </div>
    </PhoneFrame>
  );
}
