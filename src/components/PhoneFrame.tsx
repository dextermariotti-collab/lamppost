import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Map, TrendingUp, User } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LampMark } from "./LineBullet";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/courses", label: "My Path", icon: Map },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/profile", label: "Profile", icon: User },
] as const;

/**
 * The app shell. Every screen renders inside it, and it always sits centred on
 * the page:
 *
 * - under 640px it is the whole screen (a phone),
 * - 640–1023px it is a centred 420px phone-sized card,
 * - from 1024px it becomes a desktop layout: a sidebar with the navigation and a
 *   content column up to 720px wide. Screens without navigation (lessons) get
 *   just the centred column.
 *
 * The children are rendered once and only the surrounding chrome changes with
 * the breakpoint, so a screen keeps its state as the window is resized.
 */
export function PhoneFrame({
  children,
  showNav = true,
  className,
}: {
  children: ReactNode;
  showNav?: boolean;
  className?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen w-full justify-center bg-canvas p-0 sm:p-6 lg:p-0">
      <div
        className={cn(
          "relative mx-auto flex h-[100dvh] w-full max-w-[420px] flex-col overflow-hidden border-edge bg-background sm:h-[860px] sm:rounded-sm sm:border-2",
          "lg:h-[100dvh] lg:flex-row lg:rounded-none lg:border-y-0",
          showNav ? "lg:max-w-[960px]" : "lg:max-w-[720px]",
          className,
        )}
      >
        <a
          href="#main-content"
          className="sr-only rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50"
        >
          Skip to content
        </a>

        {showNav && <SideNav pathname={pathname} />}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <main
              id="main-content"
              tabIndex={-1}
              className="mx-auto w-full outline-none lg:max-w-[720px]"
            >
              {children}
            </main>
          </div>

          {showNav && (
            <nav
              aria-label="Primary"
              className="relative border-t-2 border-edge bg-card px-2 pt-1.5 pb-2 lg:hidden"
            >
              <div className="grid grid-cols-4 items-end">
                {NAV.map((item) => (
                  <BottomNavItem key={item.to} {...item} active={pathname === item.to} />
                ))}
              </div>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

/** Desktop navigation, shown from 1024px in place of the bottom bar. */
function SideNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Primary"
      className="hidden w-60 shrink-0 flex-col gap-1 border-r border-border bg-background px-4 py-8 lg:flex"
    >
      <p className="legend mb-6 flex items-center gap-2 px-3 text-sm text-foreground">
        <LampMark className="h-6 w-6" /> Lamppost
      </p>
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-bold uppercase tracking-[0.06em] transition-colors duration-200",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function BottomNavItem({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.06em] transition-colors duration-200",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
      <span className={cn("px-0.5 pb-0.5", active && "shadow-[inset_0_-3px_0_var(--primary)]")}>
        {label}
      </span>
    </Link>
  );
}
