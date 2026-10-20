// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_STATE } from "@/lib/progress-core";
import type { CheckStore } from "@/lib/unit-checks";

const h = vi.hoisted(() => ({ checks: {} as CheckStore }));

vi.mock("@/lib/progress", async () => ({
  useProgress: () => ({
    state: DEFAULT_STATE,
    streak: 0,
    hydrated: true,
    doneLessons: new Set<number>(),
    clearCelebration: vi.fn(),
    clearFreezeSaved: vi.fn(),
  }),
  deriveInsights: () => ({
    doneToday: 0,
    thisWeek: 0,
    percentile: null,
    hoursLeft: 12,
    atRisk: false,
  }),
  shiftDay: (await import("@/lib/days")).shiftDay,
}));
vi.mock("@/lib/unit-checks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/unit-checks")>()),
  useUnitChecks: () => ({ checks: h.checks, hydrated: true }),
}));
vi.mock("@/lib/badges", () => ({ useBadges: () => [] }));
vi.mock("@/lib/companion-store", () => ({ useCompanion: () => ({ companion: null }) }));
vi.mock("@/lib/mastery", () => ({ useMasteryAnalytics: () => null }));
vi.mock("@/lib/review-drills", () => ({ useDueDrills: () => ({ total: 0 }) }));
vi.mock("@/lib/use-today", () => ({ useToday: () => "2026-10-20" }));
vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/BadgeShelf", () => ({ BadgeShelf: () => null }));
vi.mock("@/components/BeforeAfterTable", () => ({ BeforeAfterTable: () => null }));
vi.mock("@/components/MilestoneCard", () => ({ MilestoneCard: () => null }));
vi.mock("@/components/ProgressSummary", () => ({
  StatTiles: () => null,
  TodaySession: () => null,
}));
vi.mock("@/components/SkillsCard", () => ({ SkillsCard: () => null }));
vi.mock("@/components/StreakCalendar", () => ({ StreakCalendar: () => null }));
vi.mock("@/components/StreakFreezeCard", () => ({ StreakFreezeCard: () => null }));
vi.mock("@/components/StreakSavedCard", () => ({ StreakSavedCard: () => null }));
vi.mock("@/components/StreakStrip", () => ({ StreakStrip: () => null }));
vi.mock("@/components/ui/drawer", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    Drawer: () => null,
    DrawerContent: Pass,
    DrawerDescription: Pass,
    DrawerHeader: Pass,
    DrawerTitle: Pass,
  };
});
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ to, children }: { to: string; children?: ReactNode }) => <a href={to}>{children}</a>,
}));

import { Route } from "./progress";

const Screen = Route.options.component as () => ReactNode;

afterEach(cleanup);

describe("Progress: before and after", () => {
  it("counts the before and the after each out of their own questions", () => {
    h.checks = {
      claims: {
        before: { right: 1, total: 2, day: "2026-10-01" },
        after: { right: 2, total: 3, day: "2026-10-08" },
      },
      evidence: {
        before: { right: 2, total: 3, day: "2026-10-09" },
        after: { right: 3, total: 3, day: "2026-10-15" },
      },
    };
    render(<Screen />);
    expect(screen.getByText("Across 2 units: 3 of 5 right before, 5 of 6 after.")).toBeTruthy();
  });
});
