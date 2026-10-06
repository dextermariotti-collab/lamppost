import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LegacyLesson } from "@/components/lesson/LegacyLesson";
import { StepLesson } from "@/components/lesson/StepLesson";
import { PhoneFrame } from "@/components/PhoneFrame";
import { CURRICULUM_SLUG, TOTAL_LESSONS, lessonAt, unitById } from "@/lib/curriculum";
import { useLessonScript } from "@/lib/steps/use-lesson-script";
import { useLessonNotes } from "@/lib/use-lesson-notes";

export const Route = createFileRoute("/course/$slug/lesson/$index")({
  head: ({ params }) => {
    const meta = lessonAt(Math.max(Number(params.index) || 1, 1) - 1);
    const title = meta?.title ?? "Critical thinking lesson";
    return {
      meta: [
        { title: `${title} — Lamppost critical thinking` },
        {
          name: "description",
          content:
            meta?.objective ??
            "Train one reasoning skill with interactive steps and a short written argument.",
        },
        { property: "og:title", content: `${title} — Lamppost` },
        {
          property: "og:description",
          content: meta?.objective ?? "Practise spotting weak reasoning in everyday arguments.",
        },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: `/course/${params.slug}/lesson/${params.index}` }],
    };
  },
  component: LessonRoute,
});

/**
 * A lesson is played from its authored steps. If a lesson has none, or its script fails
 * validation, the generated version opens instead, so a learner is never locked out.
 */
function LessonRoute() {
  const { slug: slugParam, index } = Route.useParams();
  const navigate = useNavigate();
  const lessonNumber = Math.min(Math.max(Number(index) || 1, 1), TOTAL_LESSONS);
  const meta = lessonAt(lessonNumber - 1);
  const script = useLessonScript(meta?.unitId, meta?.id);
  const notes = useLessonNotes(meta?.unitId, meta?.id);

  // Old topic courses no longer exist: send any other slug to the curriculum.
  useEffect(() => {
    if (slugParam !== CURRICULUM_SLUG) {
      navigate({
        to: "/course/$slug/lesson/$index",
        params: { slug: CURRICULUM_SLUG, index: String(lessonNumber) },
        replace: true,
      });
    }
  }, [slugParam, lessonNumber, navigate]);

  if (!meta || script.status === "unavailable") return <LegacyLesson lessonNumber={lessonNumber} />;

  if (script.status === "loading" || notes.status === "loading") {
    return (
      <PhoneFrame showNav={false}>
        <div className="px-5 py-8" aria-busy="true">
          <p className="text-xs font-bold text-primary-text">{unitById(meta.unitId).title}</p>
          <h1 className="mt-1 text-2xl leading-tight">{meta.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{meta.objective}</p>
          <div className="mt-6 space-y-3" aria-hidden>
            <div className="h-2 w-full animate-pulse rounded-sm bg-muted" />
            <div className="h-40 w-full animate-pulse rounded-3xl bg-muted" />
          </div>
          <p role="status" className="mt-4 text-sm font-semibold text-muted-foreground">
            Getting your lesson ready…
          </p>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <StepLesson
      key={meta.id}
      script={script.script}
      notes={notes.status === "ready" ? notes.notes : null}
      meta={meta}
      lessonNumber={lessonNumber}
    />
  );
}
