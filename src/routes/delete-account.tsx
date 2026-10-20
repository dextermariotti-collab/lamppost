import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { LegalFooter } from "@/components/LegalFooter";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { APP_NAME, CONTACT_EMAIL, contactHref } from "@/lib/legal-config";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete your account — Lamppost" },
      {
        name: "description",
        content:
          "How to delete your Lamppost account and its data, in the app or on the website, what deleting removes, and how to ask us if you can't sign in.",
      },
      { property: "og:title", content: "Delete your account — Lamppost" },
      {
        property: "og:description",
        content: "Delete your account and everything linked to it, in Settings or by email.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/delete-account" }],
  }),
  component: DeleteAccount,
});

const STEPS = [
  `Sign in to ${APP_NAME}, in the iPhone or Android app or on the website.`,
  "Open Profile, then Settings.",
  "Under Your data, choose Delete my account.",
  "Type DELETE, then choose Delete forever.",
];

const REMOVED = [
  "Your sign-in: your email address, and the link to Google or Apple if you used one.",
  "Your profile: name, handle, companion, goals and settings.",
  "Your progress: XP, streak, badges, finished lessons, daily activity and league results.",
  "Your friends, friend requests, blocks, shared streaks and nudges.",
  "What you wrote: written arguments, debates and tutor chats.",
  "The record of the terms you agreed to and your age band.",
];

const prose = "mt-2 text-sm leading-relaxed text-foreground/80";

/**
 * The public page Google Play links to from the Data safety form: how to delete an account,
 * with or without the app, and what deleting removes. It has to work for someone who can't
 * sign in, so it needs no account and calls no server.
 */
function DeleteAccount() {
  const href = contactHref(
    `Delete my ${APP_NAME} account`,
    `Please delete my ${APP_NAME} account and its data. I signed in with (email, Google or Apple): `,
  );
  return (
    <PhoneFrame>
      <ScreenHeader
        title="Delete your account"
        description={`How to delete your ${APP_NAME} account and the data that goes with it.`}
        backTo="/support"
      />
      <div className="px-5 pb-6">
        <section className="sign p-4" aria-labelledby="delete-steps">
          <h2 id="delete-steps" className="legend text-muted-foreground">
            In the app or on the website
          </h2>
          <ol className="mt-3 space-y-3">
            {STEPS.map((step, i) => (
              <li key={step} className="flex gap-3 text-[15px] leading-snug">
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-foreground font-mono text-xs font-bold text-background"
                >
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <Button asChild className="mt-4 h-11 w-full rounded-sm font-semibold">
            <Link to="/settings">Go to Settings</Link>
          </Button>
        </section>

        <section className="mt-6" aria-labelledby="delete-removes">
          <h2 id="delete-removes" className="text-base font-extrabold">
            What deleting removes
          </h2>
          <p className={prose}>
            Your account and everything linked to it are deleted at once. It can&apos;t be undone.
            That includes:
          </p>
          <ul className="mt-2 space-y-1.5">
            {REMOVED.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed text-foreground/80">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 bg-foreground" />
                {item}
              </li>
            ))}
          </ul>
          <p className={prose}>
            The progress saved on the phone or browser you delete from is cleared too. On any other
            device, open Settings and choose Clear progress on this device, or delete the app.
          </p>
        </section>

        <section className="mt-6" aria-labelledby="delete-kept">
          <h2 id="delete-kept" className="text-base font-extrabold">
            What is kept
          </h2>
          <p className={prose}>
            Reports you made about a person or a piece of content are kept for safety, but no longer
            linked to you. So is a note of any text our safety filters turned away. Reports other
            people made about you are deleted with your account.
          </p>
        </section>

        <section className="mt-6" aria-labelledby="delete-email">
          <h2 id="delete-email" className="text-base font-extrabold">
            If you can&apos;t sign in
          </h2>
          <p className={prose}>
            Email us from the address on your account and ask us to delete it. Say whether you
            signed in with email, Google or Apple. We may ask you to confirm the account is yours
            before we delete it.
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
            <Mail aria-hidden className="h-4 w-4 shrink-0" />
            {href ? (
              <a href={href} className="underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
            ) : (
              <span>{CONTACT_EMAIL}</span>
            )}
          </p>
          <p className={prose}>
            A parent or guardian can ask for a teen&apos;s account to be deleted the same way.
          </p>
        </section>

        <section className="mt-6" aria-labelledby="delete-guest">
          <h2 id="delete-guest" className="text-base font-extrabold">
            If you never made an account
          </h2>
          <p className={prose}>
            Then nothing about you is on our servers. Your progress is kept only on your device.
            Clear it in Settings with Clear progress on this device, by clearing this site&apos;s
            data in your browser, or by deleting the app.
          </p>
        </section>

        <p className="mt-6 text-sm text-foreground/80">
          More in the{" "}
          <Link to="/legal/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          , or{" "}
          <Link to="/support" className="underline underline-offset-2">
            get help
          </Link>
          .
        </p>
      </div>
      <LegalFooter />
    </PhoneFrame>
  );
}
