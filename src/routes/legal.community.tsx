import { createFileRoute } from "@tanstack/react-router";
import { LegalScreen } from "@/components/LegalScreen";
import { COMMUNITY } from "@/lib/legal";

export const Route = createFileRoute("/legal/community")({
  head: () => ({
    meta: [
      { title: "Community Guidelines & Reporting — Lamppost" },
      {
        name: "description",
        content:
          "What isn't allowed on Lamppost, how to report generated content or another learner, and what happens after a report.",
      },
      { property: "og:title", content: "Community Guidelines & Reporting — Lamppost" },
      { property: "og:description", content: "The content rules and how to report a violation." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/legal/community" }],
  }),
  component: () => <LegalScreen doc={COMMUNITY} />,
});
