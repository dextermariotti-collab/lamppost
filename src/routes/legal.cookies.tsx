import { createFileRoute } from "@tanstack/react-router";
import { LegalScreen } from "@/components/LegalScreen";
import { COOKIES } from "@/lib/legal";

export const Route = createFileRoute("/legal/cookies")({
  head: () => ({
    meta: [
      { title: "Cookies & Tracking — Lamppost" },
      {
        name: "description",
        content:
          "What Lamppost stores on your device, why it is needed, and our position on analytics and advertising trackers.",
      },
      { property: "og:title", content: "Cookies & Tracking — Lamppost" },
      {
        property: "og:description",
        content: "Sign-in and local app storage only — no ad trackers.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/legal/cookies" }],
  }),
  component: () => <LegalScreen doc={COOKIES} />,
});
