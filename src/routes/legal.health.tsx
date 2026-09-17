import { createFileRoute } from "@tanstack/react-router";
import { LegalScreen } from "@/components/LegalScreen";
import { HEALTH } from "@/lib/legal";

export const Route = createFileRoute("/legal/health")({
  head: () => ({
    meta: [
      { title: "Health & Fitness Disclaimer — Lamppost" },
      {
        name: "description",
        content:
          "Read before starting any AI-generated training, workout or nutrition program: consult a doctor, no coaching or medical supervision, use at your own risk.",
      },
      { property: "og:title", content: "Health & Fitness Disclaimer — Lamppost" },
      {
        property: "og:description",
        content:
          "Consult a doctor first. Generated training programs are not coaching or medical care.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/legal/health" }],
  }),
  component: () => <LegalScreen doc={HEALTH} />,
});
