import { createFileRoute } from "@tanstack/react-router";
import { LegalScreen } from "@/components/LegalScreen";
import { AI_CONTENT } from "@/lib/legal";

export const Route = createFileRoute("/legal/ai-content")({
  head: () => ({
    meta: [
      { title: "AI-Generated Content Notice — Lamppost" },
      {
        name: "description",
        content:
          "How Lamppost generates lessons and quizzes, the content rules applied before and after generation, and how to report content.",
      },
      { property: "og:title", content: "AI-Generated Content Notice — Lamppost" },
      {
        property: "og:description",
        content: "Generated lessons can be wrong. Here are the limits and the content rules.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/legal/ai-content" }],
  }),
  component: () => <LegalScreen doc={AI_CONTENT} />,
});
