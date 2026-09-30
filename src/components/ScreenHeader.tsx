import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The top of every screen that isn't a tab: a back arrow, then the page title in the serif,
 * left-aligned, and an optional single line saying what the page is for. The bar holds nothing
 * else unless one small thing has to be there (`right`). 20px gutter, 24px before the first
 * block. Without a `title` it is only the bar, for screens that carry their own heading or are
 * a focused flow (a lesson, a review).
 */
export function ScreenHeader({
  title,
  description,
  backTo,
  right,
}: {
  title?: string;
  description?: ReactNode;
  backTo: string;
  right?: ReactNode;
}) {
  return (
    <header className={`px-5 pt-2 ${title ? "pb-6" : "pb-2"}`}>
      <div className="flex h-12 items-center justify-between gap-3">
        <Link
          to={backTo}
          aria-label="Go back"
          className="-ml-3 flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft aria-hidden className="h-5 w-5" />
        </Link>
        <div className="flex min-h-11 items-center justify-end gap-2">{right}</div>
      </div>
      {title && <h1 className="mt-1 text-3xl leading-tight">{title}</h1>}
      {description && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
    </header>
  );
}
