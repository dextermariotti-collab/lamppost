import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/lib/progress";
import { useReviewSchedule, type ScheduledItem } from "@/lib/reviews";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Review schedule — Lamppost" },
      {
        name: "description",
        content:
          "See which lessons come back next, and how your predict-before-reveal answers stretch or shorten each review interval.",
      },
      { property: "og:title", content: "Review schedule — Lamppost" },
      {
        property: "og:description",
        content: "Track upcoming spaced repetition reviews, weighted by your prediction answers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewSchedule,
});

type Group = { label: string; note: string; items: ScheduledItem[] };

function groupItems(items: ScheduledItem[]): Group[] {
  const groups: Group[] = [
    { label: "Overdue", note: "Waiting longer than planned", items: [] },
    { label: "Due today", note: "Ready for recall now", items: [] },
    { label: "Tomorrow", note: "Coming back next", items: [] },
    { label: "This week", note: "Within the next 7 days", items: [] },
    { label: "Later", note: "Resting — recall is still strong", items: [] },
  ];
  for (const item of items) {
    if (item.dueInDays < 0) groups[0]!.items.push(item);
    else if (item.dueInDays === 0) groups[1]!.items.push(item);
    else if (item.dueInDays === 1) groups[2]!.items.push(item);
    else if (item.dueInDays <= 7) groups[3]!.items.push(item);
    else groups[4]!.items.push(item);
  }
  return groups.filter((g) => g.items.length > 0);
}

function whenLabel(item: ScheduledItem) {
  if (item.dueInDays < 0) return `${item.overdueDays}d overdue`;
  if (item.dueInDays === 0) return "today";
  if (item.dueInDays === 1) return "tomorrow";
  return `in ${item.dueInDays}d`;
}

function SignalChip({ item }: { item: ScheduledItem }) {
  if (item.signal === "unknown") {
    return (
      <span className="text-[11px] font-semibold text-muted-foreground">standard interval</span>
    );
  }
  const shaky = item.signal === "shaky";
  const Icon = shaky ? TrendingDown : TrendingUp;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold ${
        shaky ? "text-destructive" : "text-primary"
      }`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {shaky ? "missed prediction · comes back sooner" : "predicted right · interval stretched"}
    </span>
  );
}

function ReviewSchedule() {
  const navigate = useNavigate();
  const { state } = useProgress();
  const completedBySlug = useMemo(
    () => Object.fromEntries(Object.entries(state.courses).map(([slug, c]) => [slug, c.completed])),
    [state.courses],
  );
  const { items, hydrated } = useReviewSchedule(completedBySlug);
  const groups = useMemo(() => groupItems(items), [items]);
  const dueNow = items.filter((item) => item.dueInDays <= 0).length;

  return (
    <PhoneFrame>
      <main className="journal-page min-h-full px-5 pb-10">
        <div className="flex items-center justify-between py-3">
          <Link
            to="/"
            aria-label="Back home"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="text-sm font-bold text-primary">Review schedule</p>
          <span className="w-9" />
        </div>

        <h1 className="mt-2 text-[1.9rem] italic leading-tight">What comes back next</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Every finished lesson gets a due date. Lessons where you predicted right rest longer;
          lessons where the prediction tripped you up return sooner.
        </p>

        {dueNow > 0 && (
          <Button
            onClick={() => navigate({ to: "/review" })}
            className="mt-5 h-11 w-full justify-between px-4 font-bold shadow-none"
          >
            <span>
              Review {dueNow} lesson{dueNow === 1 ? "" : "s"} now
            </span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}

        {hydrated && items.length === 0 && (
          <div className="mt-8 rounded-2xl border border-border p-5 text-center">
            <Sparkles aria-hidden="true" className="mx-auto h-5 w-5 text-primary" />
            <p className="mt-2 text-sm font-bold">Nothing tracked yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Finish a lesson and it will appear here with its first review date.
            </p>
            <Button asChild variant="outline" className="mt-4 h-10 w-full font-bold shadow-none">
              <Link to="/courses">Go to my courses</Link>
            </Button>
          </div>
        )}

        {groups.map((group) => (
          <section key={group.label} className="mt-7">
            <div className="flex items-baseline justify-between">
              <h2 className="font-sans text-lg font-bold">{group.label}</h2>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {group.items.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{group.note}</p>
            <ul className="mt-2">
              {group.items.map((item) => (
                <li key={item.key} className="border-b border-border/80 py-3">
                  <Link
                    to="/course/$slug/lesson/$index"
                    params={{ slug: item.slug, index: String(item.lessonIndex) }}
                    className="block"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-bold leading-snug">{item.lessonTitle}</p>
                      <span className="shrink-0 text-[11px] font-bold text-muted-foreground">
                        {whenLabel(item)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.topic} · lesson {item.lessonIndex + 1} · stage {item.box + 1} of 6
                    </p>
                    <div className="mt-1">
                      <SignalChip item={item} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </PhoneFrame>
  );
}
