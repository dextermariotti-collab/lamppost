// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/look-closer.functions", () => ({ lookCloser: vi.fn() }));
vi.mock("@/lib/progress", () => ({ useProgress: () => ({ doneLessons: new Set<number>() }) }));
vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ScreenHeader", () => ({ ScreenHeader: () => null }));

import { Route } from "./look";

const Screen = Route.options.component as () => ReactNode;
const field = () => screen.getByLabelText("The text") as HTMLTextAreaElement;
const submit = () => screen.getByRole("button", { name: /look closer/i }) as HTMLButtonElement;
const type = (value: string) => fireEvent.change(field(), { target: { value } });
const count = () => document.getElementById("look-text-count")!.textContent ?? "";

afterEach(cleanup);

describe("Check something you saw", () => {
  it("says what a short headline needs instead of only graying out the button", () => {
    render(<Screen />);
    type("Coffee cures cancer, study says");
    expect(submit().disabled).toBe(true);
    expect(count()).toMatch(/at least 40 characters/i);
    expect(field().getAttribute("aria-describedby")).toBe("look-text-count");
  });

  it("counts the same characters the limit counts", () => {
    render(<Screen />);
    type(`   ${"a".repeat(45)}   `);
    expect(count()).toMatch(/45 \/ 1500/);
    expect(submit().disabled).toBe(false);
    expect(count()).not.toMatch(/at least/i);
  });

  it("keeps a long paste whole and says to trim it", () => {
    render(<Screen />);
    type("b".repeat(1600));
    expect(field().value).toHaveLength(1600);
    expect(count()).toMatch(/1600 \/ 1500/);
    expect(count()).toMatch(/up to 1500 characters/i);
    expect(submit().disabled).toBe(true);
  });
});
