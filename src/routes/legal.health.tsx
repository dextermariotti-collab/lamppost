import { createFileRoute } from "@tanstack/react-router";
import { LegalScreen } from "@/components/LegalScreen";
import { HEALTH } from "@/lib/legal";

export const Route = createFileRoute("/legal/health")({
  head: () => ({
    meta: [
      { title: "Not Professional Advice — Lamppost" },
      {
        name: "description",
        content:
          "Lamppost is for learning and practice only. It is not medical, legal, financial, mental-health or safety advice.",
      },
      { property: "og:title", content: "Not Professional Advice — Lamppost" },
      {
        property: "og:description",
        content:
          "Educational use only. Ask a qualified professional about anything that matters.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/legal/health" }],
  }),
  component: () => <LegalScreen doc={HEALTH} />,
});
