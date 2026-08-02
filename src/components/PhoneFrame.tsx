import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BookOpen, Plus, TrendingUp, User, Wifi, Signal, BatteryFull } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/courses", label: "My Courses", icon: BookOpen },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function PhoneFrame({
  children,
  showNav = true,
}: {
  children: ReactNode;
  showNav?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-0 sm:p-6">
      <div className="relative flex h-[100dvh] w-full max-w-[420px] flex-col overflow-hidden bg-background shadow-float sm:h-[860px] sm:rounded-[2.75rem] sm:border-[10px] sm:border-foreground/90">
        <div className="flex items-center justify-between px-6 pt-4 pb-1 text-xs font-bold text-foreground">
          <span>9:41</span>
          <span className="flex items-center gap-1.5">
            <Signal className="h-3.5 w-3.5" />
            <Wifi className="h-3.5 w-3.5" />
            <BatteryFull className="h-4 w-4" />
          </span>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {showNav && (
          <nav className="relative border-t border-border bg-background px-3 pt-2 pb-3">
            <div className="grid grid-cols-5 items-end">
              {NAV.slice(0, 2).map((item) => (
                <NavItem key={item.to} {...item} active={pathname === item.to} />
              ))}
              <div className="flex flex-col items-center gap-1">
                <Link
                  to="/create"
                  aria-label="AI Create"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-hero-gradient text-primary-foreground shadow-card transition-transform hover:scale-105"
                >
                  <Plus className="h-6 w-6" />
                </Link>
                <span className="text-[10px] font-bold text-muted-foreground">AI Create</span>
              </div>
              {NAV.slice(2).map((item) => (
                <NavItem key={item.to} {...item} active={pathname === item.to} />
              ))}
            </div>
            <div className="mx-auto mt-2 h-1 w-32 rounded-full bg-foreground/80 sm:block" />
          </nav>
        )}
      </div>
    </div>
  );
}

function NavItem({
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
      className={cn(
        "flex flex-col items-center gap-1 pb-1 text-[10px] font-bold transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
