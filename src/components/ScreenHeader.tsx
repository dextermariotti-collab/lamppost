import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function ScreenHeader({
  title,
  backTo,
  right,
}: {
  title?: string;
  backTo: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-3 border-b border-border px-5 py-3.5">
      <Link
        to={backTo}
        aria-label="Go back"
        className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-foreground transition-colors duration-200 hover:bg-muted"
      >
        <ArrowLeft aria-hidden className="h-5 w-5" />
      </Link>
      {title ? (
        <h1 className="flex-1 text-center text-lg font-semibold">{title}</h1>
      ) : (
        <span className="flex-1" />
      )}
      <div className="flex min-w-11 items-center justify-end gap-2">{right}</div>
    </header>
  );
}
