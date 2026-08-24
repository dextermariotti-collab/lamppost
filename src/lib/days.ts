/** UTC day helpers shared by client stores and server functions. */

export function utcDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function shiftUtcDay(key: string, days: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return utcDay(d);
}

export function monthYear(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
