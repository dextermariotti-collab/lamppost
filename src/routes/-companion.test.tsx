// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COMPANION_ACCESSORIES, COMPANION_PALETTES, DEFAULT_COMPANION } from "@/lib/companions";

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
}));

import { Route } from "./companion";

const Screen = Route.options.component as () => ReactNode;
const button = (name: RegExp) => screen.getByRole("button", { name }) as HTMLButtonElement;

afterEach(cleanup);

describe("Companion screen", () => {
  it("lets every colour and accessory be worn: nothing is locked or for sale", () => {
    render(<Screen />);
    for (const palette of COMPANION_PALETTES) {
      expect(button(new RegExp(`^${palette.name}$`, "i")).disabled, palette.name).toBe(false);
    }
    for (const accessory of COMPANION_ACCESSORIES) {
      expect(button(new RegExp(`^${accessory.name}$`, "i")).disabled, accessory.name).toBe(false);
    }
    expect(document.body.textContent).not.toMatch(/gems|locked/i);
  });

  it("wears what is picked", () => {
    render(<Screen />);
    fireEvent.click(button(/^bow$/i));
    expect(button(/^bow$/i).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button(/^ocean$/i));
    expect(button(/^ocean$/i).getAttribute("aria-pressed")).toBe("true");
  });

  it("gives every colour and accessory a 44px target", () => {
    render(<Screen />);
    for (const name of [/^lavender$/i, /^ocean$/i, /little hat/i, /little crown/i]) {
      expect(button(name).className, String(name)).toMatch(/\b(min-)?h-11\b/);
    }
  });
});
