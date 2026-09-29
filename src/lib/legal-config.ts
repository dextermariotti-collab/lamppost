/**
 * The facts about the business that only its owner can supply. Every legal page, the
 * signup consent, the support page and the account screens read them from here, so filling
 * them in is one edit. Anything still in [SQUARE BRACKETS] is a placeholder, not a fact.
 */

export const APP_NAME = "Lamppost";
export const COMPANY_NAME = "[COMPANY NAME]";
export const CONTACT_EMAIL = "[CONTACT EMAIL]";
export const MAILING_ADDRESS = "[MAILING ADDRESS]";
export const GOVERNING_STATE = "[STATE]";
export const EFFECTIVE_DATE = "[EFFECTIVE DATE]";

/**
 * Which text a person agreed to. Bump the matching version whenever a document changes in a
 * way people should be asked about again: everyone whose recorded version is older is shown
 * the consent screen once before using their account.
 */
export const TERMS_VERSION = "2026-09-30";
export const PRIVACY_VERSION = "2026-09-30";

/** The youngest age that may hold an account, and the age below which a guardian must agree. */
export const MIN_ACCOUNT_AGE = 13;
export const ADULT_AGE = 18;

export const isPlaceholder = (value: string) => value.startsWith("[") && value.endsWith("]");

/**
 * A mailto: link to the contact address, or null while it is still a placeholder (a link to
 * "[CONTACT EMAIL]" would open a blank message to nobody).
 */
export function contactHref(subject: string, body = ""): string | null {
  if (isPlaceholder(CONTACT_EMAIL)) return null;
  const query = new URLSearchParams({ subject, ...(body ? { body } : {}) })
    .toString()
    .replace(/\+/g, "%20");
  return `mailto:${CONTACT_EMAIL}?${query}`;
}
