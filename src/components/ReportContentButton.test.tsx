// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  submit: vi.fn(),
  session: { userId: "11111111-1111-1111-1111-111111111111" as string | null, ready: true },
  useSessionUser: vi.fn(),
  contactHref: vi.fn<(subject: string, body?: string) => string | null>(),
}));

vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/reports.functions", () => ({
  REPORT_REASONS: [
    { value: "inaccurate", label: "Factually wrong or misleading" },
    { value: "other", label: "Something else" },
  ],
  submitContentReport: h.submit,
}));
vi.mock("@/lib/companion-store", () => ({ useSessionUser: h.useSessionUser }));
vi.mock("@/lib/legal-config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/legal-config")>()),
  contactHref: h.contactHref,
}));

import { CONTACT_EMAIL } from "@/lib/legal-config";
import { ReportContentButton } from "./ReportContentButton";

const CONTEXT = {
  courseTopic: "Tutor chat",
  lessonTitle: "What is actually claimed",
  lessonIndex: 1,
  excerpt: `  ${"The guide said this. ".repeat(200)}  `,
};

function mailto(subject: string, body = "") {
  return `mailto:reports@lamppost.example?${new URLSearchParams({ subject, body })}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.session = { userId: "11111111-1111-1111-1111-111111111111", ready: true };
  h.useSessionUser.mockImplementation(() => h.session);
  h.contactHref.mockReturnValue(null);
  window.matchMedia ??= (() => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

const open = async () => {
  fireEvent.click(screen.getByRole("button", { name: /report this content/i }));
  return screen.findByRole("dialog");
};

describe("ReportContentButton, signed in", () => {
  it("doesn't ask who is signed in until it is opened", async () => {
    render(<ReportContentButton context={CONTEXT} />);
    expect(h.useSessionUser).not.toHaveBeenCalled();
    await open();
    expect(h.useSessionUser).toHaveBeenCalled();
  });

  it("needs a reason, then sends the surface, lesson and a capped excerpt", async () => {
    h.submit.mockResolvedValue({ ok: true });
    render(<ReportContentButton context={CONTEXT} />);
    await open();
    const send = screen.getByRole("button", { name: "Send report" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    fireEvent.click(screen.getByLabelText("Factually wrong or misleading"));
    fireEvent.change(screen.getByLabelText(/anything else/i), {
      target: { value: "It got the date wrong." },
    });
    fireEvent.click(send);

    await waitFor(() => expect(h.submit).toHaveBeenCalledTimes(1));
    const { data } = h.submit.mock.calls[0]![0];
    expect(data).toMatchObject({
      courseTopic: "Tutor chat",
      lessonTitle: "What is actually claimed",
      lessonIndex: 1,
      reason: "inaccurate",
      details: "It got the date wrong.",
    });
    expect(data.excerpt.length).toBeLessThanOrEqual(2000);
    expect(data.excerpt.startsWith("The guide said this.")).toBe(true);
    expect((await screen.findByRole("status")).textContent).toMatch(/sent for review/);
    expect(screen.queryByText(/sign in|account/i)).toBeNull();
  });

  it("says so when the report doesn't send", async () => {
    h.submit.mockRejectedValue(new Error(""));
    render(<ReportContentButton context={CONTEXT} />);
    await open();
    fireEvent.click(screen.getByLabelText("Something else"));
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/didn't send/);
  });
});

describe("ReportContentButton, signed out", () => {
  beforeEach(() => {
    h.session = { userId: null, ready: true };
  });

  it("offers an email with the report filled in, since sending needs an account", async () => {
    h.contactHref.mockImplementation(mailto);
    render(<ReportContentButton context={CONTEXT} />);
    await open();
    expect(screen.queryByRole("button", { name: "Send report" })).toBeNull();
    expect(screen.getByText(/needs an account/i)).toBeTruthy();
    // Until a reason is picked, the email can't be started.
    expect(screen.queryByRole("link", { name: /email this report/i })).toBeNull();

    fireEvent.click(screen.getByLabelText("Factually wrong or misleading"));
    const link = screen.getByRole("link", { name: /email this report/i });
    const url = new URL(link.getAttribute("href")!);
    expect(url.protocol).toBe("mailto:");
    const body = url.searchParams.get("body") ?? "";
    expect(url.searchParams.get("subject")).toMatch(/AI-generated content/);
    expect(body).toContain("Where: Tutor chat");
    expect(body).toContain("Lesson: What is actually claimed");
    expect(body).toContain("Reason: Factually wrong or misleading");
    const said = body.slice(body.indexOf("What it said: ") + "What it said: ".length);
    expect(said.length).toBeLessThanOrEqual(500);
    expect(h.submit).not.toHaveBeenCalled();
  });

  it("names the contact address while there is no email link yet", async () => {
    render(<ReportContentButton context={CONTEXT} />);
    await open();
    expect(screen.queryByRole("link", { name: /email this report/i })).toBeNull();
    expect(
      screen.getByText(new RegExp(`email ${CONTACT_EMAIL.replace(/[[\]]/g, "\\$&")}`)),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Send report" })).toBeNull();
  });
});
