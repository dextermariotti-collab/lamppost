import { createFileRoute } from "@tanstack/react-router";
import { LegalScreen } from "@/components/LegalScreen";
import { DMCA } from "@/lib/legal";

export const Route = createFileRoute("/legal/dmca")({
  head: () => ({
    meta: [
      { title: "Copyright & DMCA Policy — Lamppost" },
      {
        name: "description",
        content:
          "How rights holders submit a copyright claim about Lamppost content, and how we respond to notices and counter-notices.",
      },
      { property: "og:title", content: "Copyright & DMCA Policy — Lamppost" },
      { property: "og:description", content: "Submitting and responding to copyright claims." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/legal/dmca" }],
  }),
  component: () => <LegalScreen doc={DMCA} />,
});
