import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, HelpCircle, Sparkles, XCircle } from "lucide-react";
import { useMemo } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { Button } from "@/components/ui/button";
import { CURRICULUM_SLUG } from "@/lib/curriculum";
import { EXERCISE_LABEL } from "@/lib/exercises";
import { DRILL_INTERVALS, useDrillSchedule, type ScheduledDrill } from "@/lib/review-drills";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Review schedule — Lamppost" },
      {
        name: "description",
        content:
          "See which reasoning drills come back next. Missed drills return in a day; the ones you keep getting right rest for two weeks.",
      },
      { property: "og:title", content: "Review schedule — Lamppost" },
      {
        property: "og:description",
        content: "Track upcoming drill reviews, scheduled from what you actually got wrong.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewSchedule,
});

type Group = { label: string; note: string; items: ScheduledDrill[] };

function groupItems(items: ScheduledDrill[]): Group[] {
  const groups: Group[] = [
    { label: "Overdue", note: "Waiting longer than planned", items: [] },
    { label: "Due today", note: "Ready now, as a new scenario", items: [] },
    { label: "Tomorrow", note: "Coming back next", items: [] },
    { label: "This week", note: "Within the next 7 days", items: [] },
    { label: "Later", note: "Resting — this one is sticking", items: [] },
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

function whenLabel(item: ScheduledDrill) {
  if (item.dueInDays < 0) return `${item.overdueDays}d overdue`;
  if (item.dueInDays === 0) return "today";
  if (item.dueInDays === 1) return "tomorrow";
  return `in ${item.dueInDays}d`;
}

function ReasonChip({ item }: { item: ScheduledDrill }) {
  const missed = item.reason === "missed";
  const Icon = missed ? XCircle : HelpCircle;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold ${
        missed ? "text-destructive" : "text-primary-text"
      }`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {missed ? "missed it — comes back soonest" : "answered unsure — worth another look"}
    </span>
  );
}

function ReviewSchedule() {
  const navigate = useNavigate();
  const { items, hydrated } = useDrillSchedule();
  const groups = useMemo(() => groupItems(items), [items]);
  const dueNow = items.filter((item) => item.dueInDays <= 0).length;

  return (
    <PhoneFrame>
      <main className="min-h-full px-5 pb-10">
        <div className="flex items-center justify-between py-3">
          <Link
            to="/"
            aria-label="Back home"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="text-sm font-bold text-primary-text">Review schedule</p>
          <span className="w-9" />
        </div>

        <h1 className="mt-2 text-[1.9rem] leading-tight">What comes back next</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Every drill you miss — or answer without much confidence — gets a return date:{" "}
          {DRILL_INTERVALS.join(", ")} days, stretching each time you get it right and resetting
          when you don't. Reviews always use a new scenario for the same skill.
        </p>

        {dueNow > 0 && (
          <Button
            onClick={() => navigate({ to: "/review" })}
            className="mt-5 h-11 w-full justify-between px-4 font-bold shadow-none"
          >
            <span>
              Review {dueNow} drill{dueNow === 1 ? "" : "s"} now
            </span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}

        {hydrated && items.length === 0 && (
          <div className="mt-8 rounded-2xl border border-border p-5 text-center">
            <Sparkles aria-hidden="true" className="mx-auto h-5 w-5 text-primary-text" />
            <p className="mt-2 text-sm font-bold">Nothing queued yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Nothing you've answered has needed a second look. Drills you get wrong will show up
              here.
            </p>
            <Button asChild variant="outline" className="mt-4 h-10 w-full font-bold shadow-none">
              <Link to="/course/$slug" params={{ slug: CURRICULUM_SLUG }}>
                Go to my path
              </Link>
            </Button>
          </div>
        )}

        {groups.map((group) => (
          <section key={group.label} className="mt-7">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-bold">{group.label}</h2>
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
                    params={{ slug: CURRICULUM_SLUG, index: String(item.lessonIndex + 1) }}
                    className="block"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-bold leading-snug">{EXERCISE_LABEL[item.kind]}</p>
                      <span className="shrink-0 text-[11px] font-bold text-muted-foreground">
                        {whenLabel(item)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.unitTitle} · {item.lessonTitle} · stage {item.box + 1} of{" "}
                      {DRILL_INTERVALS.length}
                    </p>
                    <div className="mt-1">
                      <ReasonChip item={item} />
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
