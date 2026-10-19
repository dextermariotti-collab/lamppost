// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToday } from "./use-today";

/** Home and Progress read "today" from this, so a screen left open overnight moves on. */
describe("useToday", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 18, 23, 59, 0));
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("moves to the new day at local midnight", () => {
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe("2026-10-18");
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current).toBe("2026-10-18");
    act(() => {
      vi.advanceTimersByTime(40_000);
    });
    expect(result.current).toBe("2026-10-19");
  });

  it("catches up when the app comes back to the foreground", () => {
    const { result } = renderHook(() => useToday());
    vi.setSystemTime(new Date(2026, 9, 21, 8, 0));
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe("2026-10-21");
  });
});
