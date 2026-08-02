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
    <header className="flex items-center gap-3 px-5 py-3">
      <Link
        to={backTo}
        aria-label="Go back"
        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      {title ? (
        <h1 className="flex-1 text-center text-lg font-bold">{title}</h1>
      ) : (
        <span className="flex-1" />
      )}
      <div className="flex min-w-9 items-center justify-end gap-2">{right}</div>
    </header>
  );
}
