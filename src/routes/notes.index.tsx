import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { LineBullet } from "@/components/LineBullet";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { LESSONS, UNITS, lessonIndexOf } from "@/lib/curriculum";
import { useProgress } from "@/lib/progress";
import { useAllNotes } from "@/lib/use-lesson-notes";

export const Route = createFileRoute("/notes/")({
  head: () => ({
    meta: [
      { title: "Your notes — Lamppost" },
      {
        name: "description",
        content: "The idea in full from every critical thinking lesson you have finished.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotesLibrary,
});

const UNIT_IDS = UNITS.map((u) => u.id);

/**
 * Every finished lesson's notes, by unit, each with the question it leaves you with, so the
 * questions read as one field guide. A lesson's notes appear once it's done: trying it first is
 * what makes them stick.
 */
function NotesLibrary() {
  const { doneLessons, hydrated } = useProgress();
  const notes = useAllNotes(UNIT_IDS);

  const units = useMemo(
    () =>
      UNITS.map((unit) => ({
        unit,
        lessons: LESSONS.filter(
          (l) => l.unitId === unit.id && doneLessons.has(lessonIndexOf(l.id)) && notes?.[l.id],
        ),
      })).filter((u) => u.lessons.length > 0),
    [doneLessons, notes],
  );

  return (
    <PhoneFrame>
      <ScreenHeader
        backTo="/progress"
        title="Your notes"
        description="The idea in full from each lesson you've finished, and the question it leaves you with."
      />
      <div className="px-5 pb-10">
        {!hydrated || !notes ? (
          <div aria-busy="true" className="h-40 animate-pulse rounded-3xl bg-muted" />
        ) : units.length === 0 ? (
          <div className="rounded-3xl bg-card p-5 shadow-soft">
            <p className="text-sm leading-relaxed">
              Notes from each lesson collect here once you finish it.
            </p>
            <Link
              to="/courses"
              className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-primary-text"
            >
              Go to My Path
            </Link>
          </div>
        ) : (
          <div className="space-y-7">
            {units.map(({ unit, lessons }) => (
              <section key={unit.id}>
                <h2 className="legend flex items-center gap-2 text-foreground">
                  <LineBullet unitId={unit.id} /> {unit.title}
                </h2>
                <ul className="mt-2 divide-y divide-border border-y border-border">
                  {lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        to="/notes/$lessonId"
                        params={{ lessonId: lesson.id }}
                        className="flex min-h-14 items-center gap-3 py-3"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-bold">{lesson.title}</span>
                          <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
                            {notes[lesson.id]!.ask}
                          </span>
                        </span>
                        <ChevronRight
                          aria-hidden
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
