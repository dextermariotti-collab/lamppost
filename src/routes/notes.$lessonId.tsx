import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { NotesView } from "@/components/lesson/NotesView";
import { CURRICULUM_SLUG, LESSONS, lessonIndexOf, unitById } from "@/lib/curriculum";
import { useProgress } from "@/lib/progress";
import { useLessonNotes } from "@/lib/use-lesson-notes";

export const Route = createFileRoute("/notes/$lessonId")({
  beforeLoad: ({ params }) => {
    if (lessonIndexOf(params.lessonId) < 0) throw redirect({ to: "/notes", replace: true });
  },
  head: ({ params }) => {
    const title = LESSONS.find((l) => l.id === params.lessonId)?.title ?? "Lesson notes";
    return {
      meta: [
        { title: `${title}: notes — Lamppost` },
        { name: "description", content: "The idea in full from a critical thinking lesson." },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: LessonNotesScreen,
});

function LessonNotesScreen() {
  const { lessonId } = Route.useParams();
  const meta = LESSONS.find((l) => l.id === lessonId)!;
  const index = lessonIndexOf(lessonId);
  const { doneLessons, hydrated } = useProgress();
  const notes = useLessonNotes(meta.unitId, meta.id);
  const done = doneLessons.has(index);
  const lessonLink = {
    to: "/course/$slug/lesson/$index" as const,
    params: { slug: CURRICULUM_SLUG, index: String(index + 1) },
  };

  return (
    <PhoneFrame>
      <ScreenHeader backTo="/notes" />
      <div className="px-5 pb-10">
        <p className="text-[11px] font-semibold text-primary-text">
          {unitById(meta.unitId).title} · The idea in full
        </p>
        <h1 className="mt-1 text-3xl leading-tight">{meta.title}</h1>

        {!hydrated || notes.status === "loading" ? (
          <div aria-busy="true" className="mt-6 h-40 animate-pulse rounded-3xl bg-muted" />
        ) : !done || !notes.notes ? (
          <div className="mt-6 rounded-3xl bg-card p-5 shadow-soft">
            <p className="text-sm leading-relaxed">
              {done
                ? "This lesson has no notes yet."
                : "These notes open once you've done the lesson. Trying it first is what makes them stick."}
            </p>
            <Link
              {...lessonLink}
              className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-primary-text"
            >
              {done ? "Practise the lesson again" : "Start the lesson"}
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{meta.objective}</p>
            <div className="mt-6">
              <NotesView notes={notes.notes} />
            </div>
            <Link
              {...lessonLink}
              className="mt-6 flex min-h-12 items-center justify-center rounded-sm border-2 border-edge text-sm font-bold"
            >
              Practise the lesson again
            </Link>
          </>
        )}
      </div>
    </PhoneFrame>
  );
}
