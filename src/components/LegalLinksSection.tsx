import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { LEGAL_DOCS } from "@/lib/legal";

/** The legal documents, reachable from settings whether or not someone has an account. */
export function LegalLinksSection() {
  return (
    <section className="mt-8" aria-labelledby="legal-links-heading">
      <h2 id="legal-links-heading" className="text-sm font-bold">
        Legal &amp; policies
      </h2>
      <ul className="mt-2 space-y-2">
        {LEGAL_DOCS.map((doc) => (
          <li key={doc.slug}>
            <Link
              to={doc.route}
              className="flex min-h-14 items-center gap-3 rounded-2xl bg-card p-3 shadow-soft"
            >
              <span className="flex-1">
                <span className="block text-sm font-bold">{doc.title}</span>
                <span className="block text-xs text-muted-foreground">{doc.summary}</span>
              </span>
              <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
