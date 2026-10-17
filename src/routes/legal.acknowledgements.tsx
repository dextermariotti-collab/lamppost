import { createFileRoute } from "@tanstack/react-router";
import { LegalFooter } from "@/components/LegalFooter";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ALSO_BUILT_WITH, FONTS, PACKAGES, groupByLicence } from "@/lib/acknowledgements";
import { APP_NAME } from "@/lib/legal-config";

export const Route = createFileRoute("/legal/acknowledgements")({
  head: () => ({
    meta: [
      { title: "Acknowledgments — Lamppost" },
      {
        name: "description",
        content:
          "The open-source software and typefaces Lamppost is built with, and their licenses.",
      },
      { property: "og:title", content: "Acknowledgments — Lamppost" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/legal/acknowledgements" }],
  }),
  component: Acknowledgements,
});

function Acknowledgements() {
  const groups = groupByLicence();
  return (
    <PhoneFrame>
      <ScreenHeader title="Acknowledgments" backTo="/legal" />
      <div className="px-5 pb-6">
        <p className="text-sm leading-relaxed font-semibold text-foreground/85">
          {APP_NAME} stands on other people&apos;s work. These are the open-source packages and
          typefaces it uses, with the license each one is shared under. Each package&apos;s full
          license text and copyright notice is in its own repository, linked below.
        </p>

        <section className="mt-6" aria-labelledby="ack-fonts">
          <h2 id="ack-fonts" className="text-base font-extrabold">
            Typefaces
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Loaded from Google Fonts when you open the app, which means your device contacts Google
            to fetch them. See the Privacy Policy.
          </p>
          <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
            {FONTS.map((font) => (
              <li key={font.name} className="flex items-baseline justify-between gap-3 p-3">
                <a
                  href={font.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-bold underline underline-offset-2"
                >
                  {font.name}
                </a>
                <span className="text-right text-xs text-muted-foreground">{font.license}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6" aria-labelledby="ack-art">
          <h2 id="ack-art" className="text-base font-extrabold">
            Artwork and icons
          </h2>
          <p className="mt-1 text-sm leading-relaxed font-semibold text-foreground/80">
            The companions, badges and illustrations are drawn in code for {APP_NAME}. Interface
            icons come from the Lucide icon set (ISC license), which appears in the list below.
          </p>
        </section>

        <section className="mt-6" aria-labelledby="ack-built">
          <h2 id="ack-built" className="text-base font-extrabold">
            Also built with
          </h2>
          <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
            {ALSO_BUILT_WITH.map((item) => (
              <li key={item.name} className="flex items-baseline justify-between gap-3 p-3">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-bold underline underline-offset-2"
                >
                  {item.name}
                </a>
                <span className="text-xs text-muted-foreground">{item.license}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6" aria-labelledby="ack-packages">
          <h2 id="ack-packages" className="text-base font-extrabold">
            Open-source packages ({PACKAGES.length})
          </h2>
          {groups.map((group) => (
            <div key={group.license} className="mt-3">
              <h3 className="text-sm font-bold">
                {group.license}{" "}
                <span className="font-normal text-muted-foreground">({group.items.length})</span>
              </h3>
              <ul className="mt-1 space-y-0.5">
                {group.items.map((pkg) => (
                  <li key={pkg.name} className="text-xs text-muted-foreground">
                    {pkg.url ? (
                      <a
                        href={pkg.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-8 items-center font-semibold text-foreground underline underline-offset-2"
                      >
                        {pkg.name}
                      </a>
                    ) : (
                      <span className="font-semibold text-foreground">{pkg.name}</span>
                    )}{" "}
                    {pkg.version}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>
      <LegalFooter />
    </PhoneFrame>
  );
}
