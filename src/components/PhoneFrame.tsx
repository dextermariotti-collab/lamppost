import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BookOpen, Plus, TrendingUp, User } from "lucide-react";
import type { ReactNode } from "react";
import { clampBrief } from "@/lib/course-brief";
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
  className,
}: {
  children: ReactNode;
  showNav?: boolean;
  className?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-0 sm:p-6">
      <div className={cn("relative flex h-[100dvh] w-full max-w-[420px] flex-col overflow-hidden border-border bg-background sm:h-[860px] sm:rounded-[1.5rem] sm:border", className)}>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {showNav && (
          <nav className="relative border-t border-border bg-background px-3 pt-3 pb-3">
            <div className="grid grid-cols-5 items-end">
              {NAV.slice(0, 2).map((item) => (
                <NavItem key={item.to} {...item} active={pathname === item.to} />
              ))}
              <div className="flex flex-col items-center gap-1">
                <Link
                  to="/setup"
                  search={clampBrief({ topic: "" })}
                  aria-label="AI Create"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Plus className="h-6 w-6" />
                </Link>
                <span className="text-[10px] font-bold text-muted-foreground">AI Create</span>
              </div>
              {NAV.slice(2).map((item) => (
                <NavItem key={item.to} {...item} active={pathname === item.to} />
              ))}
            </div>
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
        "flex flex-col items-center gap-1 pb-1 text-[10px] font-semibold transition-colors duration-200",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
