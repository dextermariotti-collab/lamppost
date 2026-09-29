import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import type { LegalDoc } from "@/lib/legal";

/** Renders one legal document inside the app's phone frame. */
export function LegalScreen({ doc, backTo = "/legal" }: { doc: LegalDoc; backTo?: string }) {
  return (
    <PhoneFrame>
      <ScreenHeader title={doc.title} backTo={backTo} />
      <div className="px-5 pb-12">
        <p className="text-[11px] font-semibold text-muted-foreground">
          Effective {doc.updated}
          {doc.version ? ` · Version ${doc.version}` : ""}
        </p>
        <p className="mt-2 text-sm leading-relaxed font-semibold text-foreground/85">{doc.intro}</p>

        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-flame/10 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-flame" />
          <p className="text-xs font-semibold text-foreground/80">
            Draft. Anything in [SQUARE BRACKETS] is a placeholder for a fact the owner still has to
            fill in, and sections marked <span className="font-extrabold">Needs legal review</span>{" "}
            must be approved by a lawyer before launch.
          </p>
        </div>

        {doc.sections.map((section) => (
          <section key={section.heading} className="mt-6">
            <h2 className="text-base font-extrabold">{section.heading}</h2>
            {section.review && (
              <span className="mt-1 inline-block rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary-text">
                Needs legal review
              </span>
            )}
            <div className="mt-2 space-y-2">
              {section.body.map((block, i) =>
                typeof block === "string" ? (
                  <p key={i} className="text-sm leading-relaxed font-semibold text-foreground/80">
                    {block}
                  </p>
                ) : (
                  <ul key={i} className="space-y-1.5">
                    {block.list.map((item) => (
                      <li
                        key={item}
                        className="flex gap-2 text-sm leading-relaxed font-semibold text-foreground/80"
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ),
              )}
            </div>
          </section>
        ))}

        <Link
          to="/legal"
          className="mt-8 flex h-11 items-center justify-center rounded-full bg-card text-sm font-bold shadow-soft"
        >
          All legal pages
        </Link>
      </div>
    </PhoneFrame>
  );
}
