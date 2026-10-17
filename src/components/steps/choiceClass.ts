/** Shared styling for a tappable choice: a sign with a heavy rule, and a mark that isn't just color. */
export function choiceClass(state: "idle" | "selected" | "right" | "wrong" | "dim") {
  const base =
    "flex min-h-12 w-full items-start gap-3 rounded-sm border-2 px-4 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
  const states = {
    idle: "border-edge bg-card hover:bg-muted",
    selected: "border-foreground bg-primary-soft",
    right: "border-success bg-success/10",
    wrong: "border-destructive border-dashed bg-destructive/5",
    dim: "border-border bg-card opacity-60",
  } as const;
  return `${base} ${states[state]}`;
}
