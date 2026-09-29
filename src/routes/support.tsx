import { createFileRoute, Link } from "@tanstack/react-router";
import { LifeBuoy, Mail } from "lucide-react";
import { LegalFooter } from "@/components/LegalFooter";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { APP_NAME, CONTACT_EMAIL, contactHref } from "@/lib/legal-config";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Help and support — Lamppost" },
      {
        name: "description",
        content: "How to get help with Lamppost, report a problem or a person, and reach us.",
      },
      { property: "og:title", content: "Help and support — Lamppost" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/support" }],
  }),
  component: Support,
});

function Support() {
  const href = contactHref(`${APP_NAME} support`);
  return (
    <PhoneFrame>
      <ScreenHeader title="Help and support" backTo="/settings" />
      <div className="px-5 pb-6">
        <div className="flex items-start gap-3 rounded-3xl bg-primary-soft p-4">
          <LifeBuoy aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary-text" />
          <p className="text-sm leading-relaxed font-semibold text-accent-foreground">
            Something wrong, unclear or unsafe? Tell us. A person reads what you send.
          </p>
        </div>

        <section className="mt-6" aria-labelledby="support-contact">
          <h2 id="support-contact" className="text-base font-extrabold">
            Contact us
          </h2>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
            <Mail aria-hidden className="h-4 w-4 shrink-0 text-primary-text" />
            {href ? (
              <a href={href} className="underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
            ) : (
              <span>{CONTACT_EMAIL}</span>
            )}
          </p>
          <p className="mt-2 text-sm leading-relaxed font-semibold text-foreground/80">
            Say what you were doing and what happened. Please don&apos;t send passwords.
          </p>
        </section>

        <section className="mt-6" aria-labelledby="support-self">
          <h2 id="support-self" className="text-base font-extrabold">
            Things you can do yourself
          </h2>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed font-semibold text-foreground/80">
            <li>
              <span className="font-extrabold">Download or delete your data:</span> Settings, under
              Your data. Deleting an account is permanent and takes effect at once.
            </li>
            <li>
              <span className="font-extrabold">Report a person, or block them:</span> open their
              profile from the Friends screen, or use the block button on a friend request. Blocked
              people are listed in Settings, where you can unblock them.
            </li>
            <li>
              <span className="font-extrabold">Report a lesson or an AI answer:</span> use
              &ldquo;Report this content&rdquo; at the bottom of the screen where you saw it.
            </li>
            <li>
              <span className="font-extrabold">Choose what friends see:</span> the sharing switch on
              the Friends screen and in Settings.
            </li>
          </ul>
        </section>

        <section className="mt-6" aria-labelledby="support-urgent">
          <h2 id="support-urgent" className="text-base font-extrabold">
            If someone is in danger
          </h2>
          <p className="mt-2 text-sm leading-relaxed font-semibold text-foreground/80">
            {APP_NAME} can&apos;t respond to emergencies. If you or someone else is in danger,
            contact your local emergency services. If you&apos;re struggling, talk to someone you
            trust or a crisis line in your country.
          </p>
        </section>

        <p className="mt-6 text-sm font-semibold text-foreground/80">
          Read the{" "}
          <Link to="/legal/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/legal/terms" className="underline underline-offset-2">
            Terms
          </Link>
          .
        </p>
      </div>
      <LegalFooter />
    </PhoneFrame>
  );
}
