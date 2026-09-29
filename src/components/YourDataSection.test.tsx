// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  exportData: vi.fn(),
  deleteAccount: vi.fn(),
  signOut: vi.fn(),
  navigate: vi.fn(),
  contactHref: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
}));
vi.mock("@/lib/account-data.functions", () => ({
  exportMyData: h.exportData,
  deleteMyAccount: h.deleteAccount,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signOut: h.signOut } } }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => h.navigate }));
vi.mock("@/lib/legal-config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/legal-config")>()),
  contactHref: h.contactHref,
}));

import { DeviceDataSection, YourDataSection } from "./YourDataSection";

beforeEach(() => {
  window.localStorage.clear();
  h.contactHref.mockReturnValue(null);
  h.deleteAccount.mockResolvedValue({ ok: true });
  h.signOut.mockResolvedValue({});
  h.exportData.mockResolvedValue({ profile: { id: "u" } });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Your data", () => {
  it("offers a download, a request by email, and deletion, each at a 44px target", () => {
    h.contactHref.mockReturnValue("mailto:help@example.test?subject=Data%20request");
    render(<YourDataSection />);
    expect(screen.getByRole("button", { name: "Download my data" }).className).toMatch(/min-h-11/);
    const email = screen.getByRole("link", { name: /Request my data by email/ });
    expect(email.getAttribute("href")).toMatch(/^mailto:help@example\.test/);
    expect(screen.getByRole("button", { name: "Delete my account" }).className).toMatch(/min-h-11/);
  });

  it("says where to write while the contact address is still a placeholder, rather than linking to nobody", () => {
    render(<YourDataSection />);
    expect(screen.queryByRole("link", { name: /Request my data by email/ })).toBeNull();
    expect(screen.getByText(/\[CONTACT EMAIL\]/)).toBeTruthy();
  });

  it("downloads the export as a file", async () => {
    const created: Blob[] = [];
    vi.stubGlobal("URL", {
      createObjectURL: (blob: Blob) => (created.push(blob), "blob:x"),
      revokeObjectURL: () => undefined,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    render(<YourDataSection />);
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Download my data" })),
    );
    expect(h.exportData).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(JSON.parse(await created[0]!.text())).toEqual({ profile: { id: "u" } });
    vi.unstubAllGlobals();
  });

  it("asks for confirmation first and says exactly what will go", () => {
    render(<YourDataSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    expect(h.deleteAccount).not.toHaveBeenCalled();
    const text = screen.getByRole("group", { name: "Delete account" }).textContent!;
    for (const thing of [
      "profile",
      "progress",
      "rewards",
      "friends",
      "writing",
      "cannot be undone",
    ]) {
      expect(text).toContain(thing);
    }
    expect(
      (screen.getByRole("button", { name: "Delete forever" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("needs the word DELETE, and can be backed out of", () => {
    render(<YourDataSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    const input = screen.getByLabelText("Type DELETE to confirm");
    fireEvent.change(input, { target: { value: "delet" } });
    expect(
      (screen.getByRole("button", { name: "Delete forever" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.change(input, { target: { value: "delete" } });
    expect(
      (screen.getByRole("button", { name: "Delete forever" }) as HTMLButtonElement).disabled,
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Keep my account" }));
    expect(screen.queryByLabelText("Type DELETE to confirm")).toBeNull();
    expect(h.deleteAccount).not.toHaveBeenCalled();
  });

  it("deletes, clears this device, signs out and leaves", async () => {
    window.localStorage.setItem("lamppost-progress-v1", "{}");
    window.localStorage.setItem("someone-elses-key", "keep");
    render(<YourDataSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    fireEvent.change(screen.getByLabelText("Type DELETE to confirm"), {
      target: { value: "DELETE" },
    });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Delete forever" })));
    expect(h.deleteAccount).toHaveBeenCalledWith({ data: { confirm: "DELETE" } });
    expect(window.localStorage.getItem("lamppost-progress-v1")).toBeNull();
    expect(window.localStorage.getItem("someone-elses-key")).toBe("keep");
    expect(h.signOut).toHaveBeenCalledTimes(1);
    expect(h.navigate).toHaveBeenCalledWith({ to: "/", replace: true });
  });

  it("when deletion fails, says so, keeps everything on the device and does not sign out", async () => {
    h.deleteAccount.mockRejectedValue(
      new Error("Couldn't finish deleting your account. Please try again."),
    );
    window.localStorage.setItem("lamppost-progress-v1", "{}");
    render(<YourDataSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    fireEvent.change(screen.getByLabelText("Type DELETE to confirm"), {
      target: { value: "DELETE" },
    });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Delete forever" })));
    expect(screen.getByRole("alert").textContent).toMatch(/couldn't finish deleting/i);
    expect(window.localStorage.getItem("lamppost-progress-v1")).toBe("{}");
    expect(h.signOut).not.toHaveBeenCalled();
    expect(h.navigate).not.toHaveBeenCalled();
  });
});

describe("Data on this device (no account)", () => {
  it("clears only Lamppost's keys after a second tap", () => {
    window.localStorage.setItem("lamppost-progress-v1", "{}");
    window.localStorage.setItem("lamppost-exercises-v1", "{}");
    window.localStorage.setItem("other-app", "keep");
    render(<DeviceDataSection />);
    fireEvent.click(screen.getByRole("button", { name: /Clear progress on this device/ }));
    expect(window.localStorage.getItem("lamppost-progress-v1")).toBe("{}");
    fireEvent.click(screen.getByRole("button", { name: "Clear it" }));
    expect(window.localStorage.getItem("lamppost-progress-v1")).toBeNull();
    expect(window.localStorage.getItem("lamppost-exercises-v1")).toBeNull();
    expect(window.localStorage.getItem("other-app")).toBe("keep");
    expect(screen.getByRole("status").textContent).toMatch(/Cleared/);
  });
});
