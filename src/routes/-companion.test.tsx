// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COMPANION } from "@/lib/companions";
import { stubProgress } from "@/test/progress";

const h = vi.hoisted(() => ({ progress: null as unknown }));

vi.mock("@/lib/progress", () => ({ useProgress: () => h.progress }));
vi.mock("@/lib/companion-store", () => ({
  useCompanion: () => ({ companion: DEFAULT_COMPANION, loaded: true, save: vi.fn() }),
}));
vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ScreenHeader", () => ({ ScreenHeader: () => null }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => vi.fn(),
  Link: ({ to, children, ...rest }: { to: string; children?: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { Route } from "./companion";

const Screen = Route.options.component as () => ReactNode;
const show = (cosmetics: string[] = []) => {
  h.progress = stubProgress({ cosmetics });
  render(<Screen />);
};
const button = (name: RegExp) => screen.getByRole("button", { name }) as HTMLButtonElement;

afterEach(cleanup);

describe("Companion screen and unlockable cosmetics", () => {
  it("locks what has not been unlocked, and says what it costs", () => {
    show();
    expect(button(/^crown|little crown/i).disabled).toBe(true);
    expect(button(/little crown/i).textContent).toMatch(/locked, 200 gems/);
    expect(button(/headphones/i).disabled).toBe(true);
    expect(button(/^ocean, locked, 100 gems$/i).disabled).toBe(true);
    expect(button(/^rose, locked, 100 gems$/i).disabled).toBe(true);
  });

  it("never locks what a companion could always wear", () => {
    show();
    for (const name of [/little hat/i, /round glasses/i, /cosy scarf/i, /no accessory/i]) {
      expect(button(name).disabled, String(name)).toBe(false);
    }
    for (const name of [/^lavender$/i, /^ember$/i, /^mint$/i, /^sky$/i, /^plum$/i, /^sunbeam$/i]) {
      expect(button(name).disabled, String(name)).toBe(false);
    }
  });

  it("lets the learner wear what they own", () => {
    show(["bow", "ocean"]);
    expect(button(/^bow$/i).disabled).toBe(false);
    expect(button(/^ocean$/i).disabled).toBe(false);
    fireEvent.click(button(/^bow$/i));
    expect(button(/^bow$/i).getAttribute("aria-pressed")).toBe("true");
    // The others stay locked.
    expect(button(/little crown/i).disabled).toBe(true);
  });

  it("points at the shop while anything is still locked, and stops once nothing is", () => {
    show();
    expect(screen.getByRole("link", { name: /see what's available/i }).getAttribute("href")).toBe(
      "/rewards",
    );
    cleanup();
    show(["headphones", "bow", "crown", "ocean", "rose"]);
    expect(screen.queryByRole("link", { name: /see what's available/i })).toBeNull();
  });

  it("gives every colour and accessory a 44px target", () => {
    show();
    for (const name of [/^lavender$/i, /^ocean, locked/i, /little hat/i, /little crown/i]) {
      expect(button(name).className, String(name)).toMatch(/\b(min-)?h-11\b/);
    }
  });
});
