import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { useSessionUser } from "@/lib/companion-store";
import { TOTAL_LESSONS } from "@/lib/curriculum";
import { isNativeApp } from "@/lib/platform";
import { FREE_WEEKLY_PRACTICE } from "@/lib/practice";
import { getPracticeAccess, type PracticeAccess } from "@/lib/practice.functions";

/**
 * What the explain-it-back tutor costs: nothing, within a weekly allowance. The phone apps
 * don't show this page at all, since app stores reject apps that talk about purchases.
 */
export const Route = createFileRoute("/premium")({
  beforeLoad: () => {
    if (isNativeApp()) throw redirect({ to: "/progress", replace: true });
  },
  head: () => ({
    meta: [
      { title: "Explain it back — Lamppost" },
      {
        name: "description",
        content: `Nothing in Lamppost is for sale. The explain-it-back tutor is free, up to ${FREE_WEEKLY_PRACTICE} sessions a week.`,
      },
      { property: "og:title", content: "Explain it back — Lamppost" },
      {
        property: "og:description",
        content: `Every lesson is free, and so is the tutor, up to ${FREE_WEEKLY_PRACTICE} sessions a week.`,
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/premium" }],
  }),
  component: PremiumScreen,
});

const FREE = [
  `All ${TOTAL_LESSONS} lessons, with their notes`,
  "Every drill, review, unit check and daily case",
  `The explain-it-back tutor, ${FREE_WEEKLY_PRACTICE} sessions a week`,
  "Streaks, friends and the friends league",
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

  return (
    <PhoneFrame>
      <ScreenHeader
        title="Explain it back"
        description="After a lesson, the tutor asks you to explain the idea in your own words and replies to what you wrote."
        backTo="/"
      />
      <div className="px-5 pb-10">
        <section className="sign p-5" aria-labelledby="premium-cost">
          <h2 id="premium-cost" className="legend text-muted-foreground">
            What it costs
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed">
            Nothing. There is nothing for sale in Lamppost.
          </p>
          <ul className="mt-4 space-y-2.5">
            {FREE.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm font-semibold">
                <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6" aria-labelledby="premium-allowance">
          <h2 id="premium-allowance" className="legend text-muted-foreground">
            The weekly allowance
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Each tutor session uses an AI service, so there is a weekly allowance:{" "}
            {FREE_WEEKLY_PRACTICE} sessions, counted again from each Monday. Lessons, drills and
            reviews have no limit. The tutor is an AI and can get things wrong.
          </p>
          {userId ? (
            access && (
              <p className="mt-3 text-sm font-bold text-foreground">
                {access.subscribed
                  ? "Your account has no weekly limit."
                  : `${access.remaining} of ${access.freeAllowance} sessions left this week.`}
              </p>
            )
          ) : (
            <>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                The tutor needs an account, so it can count the week. Everything else works without
                one.
              </p>
              <Button asChild className="mt-4 h-11 w-full rounded-sm font-semibold">
                <Link to="/auth">Sign in</Link>
              </Button>
            </>
          )}
        </section>
      </div>
    </PhoneFrame>
  );
}
