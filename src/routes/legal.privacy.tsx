import { createFileRoute } from "@tanstack/react-router";
import { LegalScreen } from "@/components/LegalScreen";
import { PRIVACY } from "@/lib/legal";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Lamppost" },
      {
        name: "description",
        content:
          "What Lamppost collects, why, who it is shared with, how long it is kept, and how to export or delete your data.",
      },
      { property: "og:title", content: "Privacy Policy — Lamppost" },
      {
        property: "og:description",
        content: "Data collection, AI processing, retention and your rights.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/legal/privacy" }],
  }),
  component: () => <LegalScreen doc={PRIVACY} />,
});
