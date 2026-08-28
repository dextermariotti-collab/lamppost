import { createFileRoute } from "@tanstack/react-router";
import { LegalScreen } from "@/components/LegalScreen";
import { TERMS } from "@/lib/legal";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Lamppost" },
      {
        name: "description",
        content:
          "Account terms, prohibited conduct, AI-generated content terms and termination rights for Lamppost.",
      },
      { property: "og:title", content: "Terms of Service — Lamppost" },
      { property: "og:description", content: "Rules of use, account terms and prohibited conduct." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/legal/terms" }],
  }),
  component: () => <LegalScreen doc={TERMS} />,
});
