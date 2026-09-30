import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MOTIVATIONS, type Motivation } from "@/lib/onboarding";

/** A titled group of rows: one small label, one rounded card, hairlines between rows. */
export function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-6" aria-label={label}>
      <h2 className="px-1 pb-2 font-sans text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {children}
      </div>
    </section>
  );
}

const rowClass = "flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left";

/** One line of a group: a title, what it does, what it is now, and either a control or a chevron. */
export function SettingsRow({
  title,
  sub,
  value,
  control,
  to,
  onClick,
  danger = false,
}: {
  title: string;
  sub?: string;
  value?: string;
  control?: ReactNode;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const inner = (
    <>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-bold ${danger ? "text-destructive" : "text-foreground"}`}
        >
          {title}
        </span>
        {sub && <span className="block text-xs leading-snug text-muted-foreground">{sub}</span>}
      </span>
      {value && <span className="shrink-0 text-[13px] text-muted-foreground">{value}</span>}
      {control}
      {(to || onClick) && (
        <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </>
  );
  if (to)
    return (
      <Link to={to} className={rowClass}>
        {inner}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={rowClass}>
        {inner}
      </button>
    );
  return <div className={rowClass}>{inner}</div>;
}

/** A row with a title and a few either-or choices under it. */
export function SegmentedRow<T extends string | number>({
  label,
  sub,
  options,
  value,
  onChange,
}: {
  label: string;
  sub?: string;
  options: { value: T; label: ReactNode; name?: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-sm font-bold">{label}</p>
      {sub && <p className="text-xs leading-snug text-muted-foreground">{sub}</p>}
      <div role="group" aria-label={label} className="mt-2 flex gap-1.5">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={value === option.value}
            {...(option.name ? { "aria-label": option.name } : {})}
            onClick={() => onChange(option.value)}
            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              value === option.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The five situations review drills borrow examples from, picked in a sheet. */
export function FocusSheet({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: Motivation | null;
  onChange: (value: Motivation) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-[440px] rounded-t-3xl border-border">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">What you’re training for</SheetTitle>
          <SheetDescription>
            Review drills borrow examples from these situations. The lessons stay the same.
          </SheetDescription>
        </SheetHeader>
        <RadioGroup
          value={value ?? ""}
          onValueChange={(next) => onChange(next as Motivation)}
          aria-label="What you're training for"
          className="mt-4"
        >
          {MOTIVATIONS.map((option) => (
            <label
              key={option.id}
              className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border-2 px-4 py-3 ${
                value === option.id ? "border-primary bg-primary-soft" : "border-border bg-card"
              }`}
            >
              <RadioGroupItem value={option.id} className="mt-0.5 h-5 w-5" />
              <span>
                <span className="block text-sm font-bold">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.blurb}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
        <Button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-4 h-12 w-full rounded-full text-sm font-semibold"
        >
          Done
        </Button>
      </SheetContent>
    </Sheet>
  );
}
