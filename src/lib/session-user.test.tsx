// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

type Listener = (event: string, session: { user: { id: string } } | null) => void;
const h = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  loads: 0,
  listener: null as Listener | null,
}));
// The real client announces itself when it is first made; so does this one.
vi.mock("@/integrations/supabase/client", async () => {
  const { announceSupabase } = await import("@/integrations/supabase/lazy");
  const client = { auth: { getSession: h.getSession, onAuthStateChange: h.onAuthStateChange } };
  let made = false;
  return {
    getSupabase: () => {
      h.loads += 1;
      if (!made) {
        made = true;
        announceSupabase(client as never);
      }
      return client;
    },
  };
});

h.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
h.onAuthStateChange.mockImplementation((fn: Listener) => {
  h.listener = fn;
  return { data: { subscription: { unsubscribe: vi.fn() } } };
});

import { useSessionUser } from "./companion-store";

// A session is stored on this device before any screen asks who is signed in.
localStorage.setItem("sb-project-auth-token", "{}");
afterEach(cleanup);

describe("useSessionUser, signed in", () => {
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
    await waitFor(() => expect(h.listener).not.toBeNull());
    act(() => h.listener!("SIGNED_OUT", null));
    expect(screen.result.current).toEqual({ userId: null, ready: true });
    act(() => h.listener!("SIGNED_IN", { user: { id: "user-2" } }));
    expect(screen.result.current.userId).toBe("user-2");
  });
});
