// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/companion-store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/companion-store")>()),
  useSessionUser: () => ({ userId: null, ready: true }),
}));

import { readDraft } from "@/lib/companion-store";
import { CompanionOffer } from "./CompanionOffer";

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe("Companion offer", () => {
  it("waits for the first lesson", () => {
    render(<CompanionOffer lessonsDone={0} />);
    expect(screen.queryByText("Pick who practises with you")).toBeNull();
  });

  it("is offered once a lesson is done, as something optional", () => {
    render(<CompanionOffer lessonsDone={1} />);
    expect(screen.getByText("Pick who practises with you")).toBeTruthy();
    expect(screen.getByText(/Optional/)).toBeTruthy();
    expect(screen.getAllByRole("radio").length).toBeGreaterThanOrEqual(3);
  });

  it("saves the pick on this device and goes away", () => {
    render(<CompanionOffer lessonsDone={2} />);
    fireEvent.click(screen.getByRole("radio", { name: "Sage" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose Sage" }));
    expect(readDraft()?.preset).toBe("sage");
    expect(screen.queryByText("Pick who practises with you")).toBeNull();
  });

  it("takes 'Not now' as final", () => {
    const { unmount } = render(<CompanionOffer lessonsDone={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByText("Pick who practises with you")).toBeNull();
    expect(readDraft()).toBeNull();
    unmount();
    render(<CompanionOffer lessonsDone={3} />);
    expect(screen.queryByText("Pick who practises with you")).toBeNull();
  });

  it("never asks someone who already picked one", () => {
    window.localStorage.setItem(
      "lamppost-companion-draft",
      JSON.stringify({ preset: "pip", palette: "mint", accessory: "none", expression: "happy" }),
    );
    render(<CompanionOffer lessonsDone={4} />);
    expect(screen.queryByText("Pick who practises with you")).toBeNull();
  });
});
