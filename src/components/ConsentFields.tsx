import { useId } from "react";
import type { ConsentForm } from "@/lib/use-consent-form";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const field =
  "w-full min-h-11 rounded-2xl bg-card px-4 py-3 text-sm font-semibold shadow-soft outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary";

/** Shown instead of the form to someone who is too young for an account. */
export function UnderAgeNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-3xl bg-card p-5 text-center shadow-soft">
      <h1 className="text-lg">You can't make an account</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Lamppost accounts aren't available for you. We haven't saved anything you entered.
      </p>
      {children}
    </div>
  );
}

/**
 * Date of birth and the two agreements. The date is used once to pick an age band and
 * isn't kept. The wording gives no hint of which answer lets someone in.
 */
export function ConsentFields({ form }: { form: ConsentForm }) {
  const id = useId();
  const { birth, setBirth, decision } = form;

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-sm font-bold">Date of birth</legend>
        <p id={`${id}-why`} className="mt-1 text-xs text-muted-foreground">
          Used once to set up your account. We don't keep your date of birth.
        </p>
        <div className="mt-2 grid grid-cols-[1.6fr_1fr_1.2fr] gap-2">
          <div>
            <label htmlFor={`${id}-month`} className="sr-only">
              Month
            </label>
            <select
              id={`${id}-month`}
              value={birth.month}
              onChange={(e) => setBirth({ ...birth, month: e.target.value })}
              autoComplete="bday-month"
              aria-describedby={`${id}-why`}
              className={field}
            >
              <option value="">Month</option>
              {MONTHS.map((name, i) => (
                <option key={name} value={String(i + 1)}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-day`} className="sr-only">
              Day
            </label>
            <input
              id={`${id}-day`}
              inputMode="numeric"
              autoComplete="bday-day"
              maxLength={2}
              placeholder="Day"
              value={birth.day}
              onChange={(e) => setBirth({ ...birth, day: e.target.value.replace(/\D/g, "") })}
              className={field}
            />
          </div>
          <div>
            <label htmlFor={`${id}-year`} className="sr-only">
              Year
            </label>
            <input
              id={`${id}-year`}
              inputMode="numeric"
              autoComplete="bday-year"
              maxLength={4}
              placeholder="Year"
              value={birth.year}
              onChange={(e) => setBirth({ ...birth, year: e.target.value.replace(/\D/g, "") })}
              className={field}
            />
          </div>
        </div>
        {decision.kind === "invalid" && (
          <p role="alert" className="mt-2 text-xs font-bold text-destructive">
            That doesn't look like a real date. Check it and try again.
          </p>
        )}
      </fieldset>

      {form.band === "13-17" && (
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl bg-primary-soft p-3">
          <input
            type="checkbox"
            checked={form.guardian}
            onChange={(e) => form.setGuardian(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]"
          />
          <span className="text-[13px] font-semibold leading-snug text-accent-foreground">
            A parent or guardian knows I'm making this account and says it's okay.
          </span>
        </label>
      )}

      <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1">
        <input
          type="checkbox"
          checked={form.agreed}
          onChange={(e) => form.setAgreed(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]"
        />
        <span className="text-[13px] font-semibold leading-snug text-foreground">
          I agree to the{" "}
          <a
            href="/legal/terms"
            target="_blank"
            rel="noopener"
            className="font-extrabold text-primary-text underline"
          >
            Terms<span className="sr-only"> (opens in a new tab)</span>
          </a>{" "}
          and{" "}
          <a
            href="/legal/privacy"
            target="_blank"
            rel="noopener"
            className="font-extrabold text-primary-text underline"
          >
            Privacy Policy<span className="sr-only"> (opens in a new tab)</span>
          </a>
          .
        </span>
      </label>
    </div>
  );
}
