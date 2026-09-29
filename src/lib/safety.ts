/** Shared by the safety screens and the server functions behind them. */

/** What other people can see of an account. `minimal` is the default for everyone. */
export const VISIBILITIES = ["minimal", "friends"] as const;
export type Visibility = (typeof VISIBILITIES)[number];
export const DEFAULT_VISIBILITY: Visibility = "minimal";

export const isVisibility = (value: unknown): value is Visibility =>
  typeof value === "string" && (VISIBILITIES as readonly string[]).includes(value);

/** Reasons offered when reporting a person. The database accepts these and two more. */
export const USER_REPORT_REASONS = [
  { value: "harassment", label: "Harassing or bullying" },
  { value: "inappropriate_name", label: "Offensive name or handle" },
  { value: "spam", label: "Spam or unwanted requests" },
  { value: "impersonation", label: "Pretending to be someone else" },
  { value: "underage", label: "Seems to be under 13" },
  { value: "other", label: "Something else" },
] as const;
export type UserReportReason = (typeof USER_REPORT_REASONS)[number]["value"];

export const MAX_REPORT_DETAILS = 1000;
