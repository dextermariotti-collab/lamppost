import { Link } from "@tanstack/react-router";

const LINKS = [
  { to: "/legal/privacy", label: "Privacy" },
  { to: "/legal/terms", label: "Terms" },
  { to: "/legal/acknowledgements", label: "Acknowledgements" },
  { to: "/support", label: "Support" },
] as const;

/** The four links every screen a signed-out person can reach should offer. */
export function LegalFooter({
  className = "",
  compact = false,
}: {
  className?: string;
  /** Smaller type and tighter spacing, so the four links sit on one quiet line. */
  compact?: boolean;
}) {
  return (
    <nav aria-label="Legal and support" className={`px-5 pb-8 pt-4 ${className}`}>
      <ul className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0">
        {LINKS.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className={`flex min-h-11 items-center font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground ${
                compact ? "px-1.5 text-[11px]" : "px-2.5 text-xs"
              }`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
