// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ block: vi.fn(), report: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/safety.functions", () => ({ blockUser: h.block, reportUser: h.report }));

import { BlockPersonButton, ReportPersonButton } from "./PersonSafety";

const PERSON = { id: "22222222-2222-2222-2222-222222222222", name: "Sam" };

beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia ??= (() => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

describe("blocking someone", () => {
  it("explains what it does first, and blocks only when confirmed", async () => {
    h.block.mockResolvedValue({ ok: true });
    const onBlocked = vi.fn();
    render(<BlockPersonButton person={PERSON} onBlocked={onBlocked} />);
    fireEvent.click(screen.getByRole("button", { name: /block/i }));

    expect(await screen.findByText(/block sam\?/i)).toBeTruthy();
    expect(screen.getByText(/they aren.t told/i)).toBeTruthy();
    expect(h.block).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Block Sam" }));
    await waitFor(() => expect(onBlocked).toHaveBeenCalled());
    expect(h.block).toHaveBeenCalledWith({ data: { userId: PERSON.id } });
  });

  it("does nothing if they cancel", async () => {
    render(<BlockPersonButton person={PERSON} />);
    fireEvent.click(screen.getByRole("button", { name: /block/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(h.block).not.toHaveBeenCalled();
  });

  it("stays open with a message if it fails", async () => {
    h.block.mockResolvedValue({ ok: false, reason: "That couldn't be done just now." });
    const onBlocked = vi.fn();
    render(<BlockPersonButton person={PERSON} onBlocked={onBlocked} />);
    fireEvent.click(screen.getByRole("button", { name: /block/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Block Sam" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn.t be done/);
    expect(onBlocked).not.toHaveBeenCalled();
  });
});

describe("reporting someone", () => {
  it("needs a reason before it can be sent, then sends it", async () => {
    h.report.mockResolvedValue({ ok: true });
    render(<ReportPersonButton person={PERSON} />);
    fireEvent.click(screen.getByRole("button", { name: /report/i }));

    const send = (await screen.findByRole("button", { name: "Send report" })) as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    fireEvent.click(screen.getByRole("radio", { name: /harassing or bullying/i }));
    fireEvent.change(screen.getByLabelText(/anything else/i), { target: { value: " rude " } });
    expect(send.disabled).toBe(false);
    fireEvent.click(send);

    await waitFor(() =>
      expect(h.report).toHaveBeenCalledWith({
        data: { userId: PERSON.id, reason: "harassment", details: "rude" },
      }),
    );
    expect((await screen.findByRole("status")).textContent).toMatch(/report has been sent/i);
  });

  it("offers each reason as a real radio button, in one group", async () => {
    render(<ReportPersonButton person={PERSON} />);
    fireEvent.click(screen.getByRole("button", { name: /report/i }));
    const radios = await screen.findAllByRole("radio");
    expect(radios.length).toBeGreaterThanOrEqual(5);
    expect(new Set(radios.map((r) => (r as HTMLInputElement).name)).size).toBe(1);
  });
});
