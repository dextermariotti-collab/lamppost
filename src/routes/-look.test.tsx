// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recordAiConsent } from "@/lib/ai-consent";
import { LESSONS } from "@/lib/curriculum";

const lookCloser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/look-closer.functions", () => ({ lookCloser }));
vi.mock("@/components/ReportContentButton", () => ({
  ReportContentButton: ({ context }: { context: { courseTopic?: string; excerpt?: string } }) => (
    <button type="button" data-topic={context.courseTopic} data-excerpt={context.excerpt}>
      Report this content
    </button>
  ),
}));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ children }: { children?: ReactNode }) => <a href="/">{children}</a>,
}));
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

beforeEach(() => {
  window.localStorage.clear();
  lookCloser.mockReset();
  window.matchMedia ??= (() => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

const PASTED = "Doctors hate this one trick that melts fat overnight, says a new study.";
const RESULT = {
  claim: "One trick melts fat overnight.",
  lenses: [{ lessonId: LESSONS[0]!.id, question: "What is claimed?", lookFor: "The word trick." }],
  check: "Look for the study itself.",
};

describe("Check something you saw and the AI", () => {
  it("asks before what they pasted is sent, and Not now sends nothing", async () => {
    lookCloser.mockResolvedValue({ ok: true, result: RESULT });
    render(<Screen />);
    type(PASTED);
    fireEvent.click(submit());
    fireEvent.click(await screen.findByRole("button", { name: "Not now" }));
    expect(lookCloser).not.toHaveBeenCalled();
    expect(field().value).toBe(PASTED);

    fireEvent.click(submit());
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
    });
    expect(lookCloser).toHaveBeenCalledWith({ data: { text: PASTED, source: "post" } });
  });

  it("lets them report the result, without putting what they pasted in the report", async () => {
    recordAiConsent();
    lookCloser.mockResolvedValue({ ok: true, result: RESULT });
    render(<Screen />);
    type(PASTED);
    await act(async () => fireEvent.click(submit()));

    const report = await screen.findByRole("button", { name: /report this content/i });
    expect(report.dataset["topic"]).toBe("Check something you saw");
    expect(report.dataset["excerpt"]).toContain(RESULT.claim);
    expect(report.dataset["excerpt"]).toContain(RESULT.check);
    expect(report.dataset["excerpt"]).not.toContain(PASTED);
  });
});

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
