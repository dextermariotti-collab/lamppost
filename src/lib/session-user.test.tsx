// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

type Listener = (event: string, session: { user: { id: string } } | null) => void;
const h = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  listener: null as Listener | null,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: h.getSession, onAuthStateChange: h.onAuthStateChange } },
}));

import { useSessionUser } from "./companion-store";

afterEach(cleanup);

h.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
h.onAuthStateChange.mockImplementation((fn: Listener) => {
  h.listener = fn;
  return { data: { subscription: { unsubscribe: vi.fn() } } };
});

describe("useSessionUser", () => {
  it("asks for the session once however many screens mount, and late ones know it at once", async () => {
    const first = renderHook(() => useSessionUser());
    const second = renderHook(() => useSessionUser());
    await waitFor(() => expect(first.result.current).toEqual({ userId: "user-1", ready: true }));
    expect(second.result.current).toEqual({ userId: "user-1", ready: true });

    const late = renderHook(() => useSessionUser());
    expect(late.result.current).toEqual({ userId: "user-1", ready: true });
    expect(h.getSession).toHaveBeenCalledTimes(1);
    expect(h.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it("tells every screen when someone signs out or in", async () => {
    const screen = renderHook(() => useSessionUser());
    act(() => h.listener!("SIGNED_OUT", null));
    expect(screen.result.current).toEqual({ userId: null, ready: true });
    act(() => h.listener!("SIGNED_IN", { user: { id: "user-2" } }));
    expect(screen.result.current.userId).toBe("user-2");
  });
});
