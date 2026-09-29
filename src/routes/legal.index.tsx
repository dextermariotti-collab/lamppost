import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, ScrollText } from "lucide-react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { LEGAL_DOCS, PRIVACY_CONTACT } from "@/lib/legal";

export const Route = createFileRoute("/legal/")({
  head: () => ({
    meta: [
      { title: "Legal & policies — Lamppost" },
      {
        name: "description",
        content:
          "Lamppost's privacy policy, terms, AI-generated content notice, health and fitness disclaimer, community guidelines and copyright policy.",
      },
      { property: "og:title", content: "Legal & policies — Lamppost" },
      {
        property: "og:description",
        content: "Privacy, terms, AI content, health disclaimer, reporting and copyright.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/legal" }],
  }),
  component: LegalIndex,
});

function LegalIndex() {
  return (
    <PhoneFrame>
      <ScreenHeader title="Legal & policies" backTo="/settings" />
      <div className="px-5 pb-12">
        <div className="flex items-start gap-3 rounded-3xl bg-primary-soft p-4">
          <ScrollText className="mt-0.5 h-5 w-5 shrink-0 text-primary-text" />
          <p className="text-xs leading-relaxed font-semibold text-accent-foreground">
            These pages explain what data we keep, the rules for using Lamppost, where AI is used, and
            how to report or block someone. They are drafts pending legal review.
          </p>
        </div>

        <ul className="mt-4 space-y-2">
          {LEGAL_DOCS.map((doc) => (
            <li key={doc.slug}>
              <Link
                to={doc.route}
                className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft transition-transform hover:-translate-y-0.5"
              >
                <span className="flex-1">
                  <span className="block text-sm font-extrabold">{doc.title}</span>
                  <span className="block text-xs font-semibold text-muted-foreground">
                    {doc.summary}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center text-[11px] font-semibold text-muted-foreground">
          Privacy or data requests: {PRIVACY_CONTACT}
        </p>
      </div>
    </PhoneFrame>
  );
}
