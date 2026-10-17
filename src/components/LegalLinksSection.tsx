import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { LEGAL_DOCS } from "@/lib/legal";

const EXTRA = [
  { to: "/legal/acknowledgements", title: "Acknowledgments" },
  { to: "/support", title: "Help and support" },
];

/**
 * Every legal document, plus acknowledgements and support, as one line each. Reached from
 * Settings → About and policies whether or not someone has an account; each page opens with
 * its own summary, so the list doesn't repeat it.
 */
export function LegalLinksSection() {
  const items = [...LEGAL_DOCS.map((doc) => ({ to: doc.route, title: doc.title })), ...EXTRA];
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {items.map((item) => (
        <li key={item.to}>
          <Link to={item.to} className="flex min-h-12 items-center gap-3 px-4 py-2">
            <span className="flex-1 text-sm font-bold">{item.title}</span>
            <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
