// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  signOut: vi.fn(),
  navigate: vi.fn(),
  clear: vi.fn(),
  order: [] as string[],
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signOut: h.signOut } } }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => h.navigate }));
vi.mock("@/lib/device-data", () => ({ clearDeviceData: h.clear }));

import { SignOutChoice } from "./SignOutChoice";

const replace = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  h.order = [];
  h.signOut.mockImplementation(async () => h.order.push("signOut"));
  h.clear.mockImplementation(() => h.order.push("clear"));
  vi.stubGlobal("location", { ...window.location, replace });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const open = () => {
  render(<SignOutChoice />);
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
};

describe("SignOutChoice", () => {
  it("asks first, and says what happens to the progress on this device", () => {
    open();
    expect(h.signOut).not.toHaveBeenCalled();
    expect(screen.getByText(/stays on this device/)).toBeTruthy();
  });

  it("signs out and keeps the progress on this device", async () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith({ to: "/auth", replace: true }));
    expect(h.clear).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("can sign out and clear the device, then reload so nothing old is saved back", async () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Sign out and clear this device" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(h.order).toEqual(["signOut", "clear"]);
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it("can be canceled", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText(/stays on this device/)).toBeNull();
    expect(h.signOut).not.toHaveBeenCalled();
  });
});
