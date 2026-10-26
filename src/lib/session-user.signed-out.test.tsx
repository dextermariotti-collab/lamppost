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

import { getSupabase } from "@/integrations/supabase/client";
import { useSessionUser } from "./companion-store";

afterEach(cleanup);

describe("useSessionUser, signed out", () => {
  it("never downloads the client for a visitor, and follows a sign-in once a screen loads it", async () => {
    const screen = renderHook(() => useSessionUser());
    expect(screen.result.current).toEqual({ userId: null, ready: true });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(h.loads).toBe(0);
    expect(h.getSession).not.toHaveBeenCalled();

    // The sign-in screen loads the client; the session it holds reaches every screen.
    act(() => void (getSupabase as unknown as () => unknown)());
    await waitFor(() => expect(screen.result.current.userId).toBe("user-1"));
  });
});
