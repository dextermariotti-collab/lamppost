/** Shared styling for a tappable choice, with a mark that isn't just colour. */
export function choiceClass(state: "idle" | "selected" | "right" | "wrong" | "dim") {
  const base =
    "flex min-h-12 w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  const states = {
    idle: "border-border hover:border-primary/50",
    selected: "border-primary bg-primary-soft",
    right: "border-success bg-success/10",
    wrong: "border-destructive border-dashed bg-destructive/5",
    dim: "border-border opacity-60",
  } as const;
  return `${base} ${states[state]}`;
}
