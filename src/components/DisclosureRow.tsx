import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

/**
 * One line that says where things stand and opens to the detail behind it. The summary is a
 * real sentence, so the row is worth reading closed.
 */
export function DisclosureRow({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className="border-t border-border">
      <h2 className="font-sans text-base">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-14 w-full items-center gap-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">{title}</span>
            <span className="mt-0.5 block text-[13px] font-normal leading-snug text-muted-foreground">
              {summary}
            </span>
          </span>
          <ChevronRight
            aria-hidden
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          />
        </button>
      </h2>
      <div id={panelId} hidden={!open} className="pb-5">
        {children}
      </div>
    </section>
  );
}

/** The same row, for a line that leads to its own page instead of opening in place. */
export function LinkRow({ title, summary, to }: { title: string; summary: ReactNode; to: string }) {
  return (
    <section className="border-t border-border">
      <h2 className="font-sans text-base">
        <Link
          to={to}
          className="flex min-h-14 w-full items-center gap-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">{title}</span>
            <span className="mt-0.5 block text-[13px] font-normal leading-snug text-muted-foreground">
              {summary}
            </span>
          </span>
          <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      </h2>
    </section>
  );
}
