import { createFileRoute } from "@tanstack/react-router";
import { LegalLinksSection } from "@/components/LegalLinksSection";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PRIVACY_CONTACT } from "@/lib/legal";

export const Route = createFileRoute("/legal/")({
  head: () => ({
    meta: [
      { title: "About and policies — Lamppost" },
      {
        name: "description",
        content:
          "Lamppost's privacy policy, terms, AI-generated content notice, health and fitness disclaimer, community guidelines and copyright policy.",
      },
      { property: "og:title", content: "About and policies — Lamppost" },
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
      <ScreenHeader
        title="About and policies"
        description="The full text of each, in plain English. They are drafts pending legal review."
        backTo="/settings"
      />
      <div className="px-5 pb-12">
        <LegalLinksSection />

        <p className="mt-6 text-center text-[11px] font-semibold text-muted-foreground">
          Privacy or data requests: {PRIVACY_CONTACT}
        </p>
      </div>
    </PhoneFrame>
  );
}
