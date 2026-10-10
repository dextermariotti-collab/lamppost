import { Compass, MessageCircleQuestion } from "lucide-react";
import type { LessonNotes } from "@/lib/lesson-notes";

/**
 * A lesson's notes as one calm page of reading: the idea, the words for it, a worked example,
 * where it gets subtle, a question to carry and something to try. Shared by the lesson (after
 * the steps) and the notes library, so a learner rereads exactly what they read the first time.
 */
export function NotesView({ notes }: { notes: LessonNotes }) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl leading-snug">The idea</h2>
        <div className="mt-2 space-y-3">
          {notes.idea.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="text-[15px] leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl leading-snug">Words worth knowing</h2>
        <dl className="mt-2 divide-y divide-border">
          {notes.terms.map((t) => (
            <div key={t.term} className="py-2.5">
              <dt className="text-sm font-bold">{t.term}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{t.meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="text-xl leading-snug">A worked example</h2>
        <p className="mt-3 border-l-4 border-primary pl-4 text-[15px] leading-relaxed">
          {notes.example.case}
        </p>
        <ol className="mt-4 space-y-3">
          {notes.example.moves.map((move, i) => (
            <li key={move.slice(0, 40)} className="flex gap-3 text-sm leading-relaxed">
              <span
                aria-hidden
                className="flex h-6 w-6 shrink-0 items-center justify-center bg-primary font-mono text-xs font-bold text-primary-foreground"
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">{move}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-xl leading-snug">Where it gets subtle</h2>
        <div className="mt-2 space-y-4">
          {notes.subtleties.map((s) => (
            <div key={s.title}>
              <h3 className="font-sans text-sm font-bold">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-sm bg-primary-soft p-5">
        <h2 className="legend flex items-center gap-1.5 font-sans text-accent-foreground">
          <MessageCircleQuestion aria-hidden className="h-3.5 w-3.5" /> A question to carry
        </h2>
        <p className="mt-2 font-display text-xl leading-snug text-accent-foreground">{notes.ask}</p>
      </section>

      <TryItCard text={notes.tryIt} />
    </div>
  );
}

/** Something to try outside the app. Also shown on the finished screen. */
export function TryItCard({ text, className = "" }: { text: string; className?: string }) {
  return (
    <section className={`sign p-5 ${className}`}>
      <h2 className="legend flex items-center gap-1.5 font-sans text-muted-foreground">
        <Compass aria-hidden className="h-3.5 w-3.5" /> Try it this week
      </h2>
      <p className="mt-2 text-sm leading-relaxed">{text}</p>
    </section>
  );
}
