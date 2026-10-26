// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  session: { userId: null as string | null, ready: true },
  resetProgress: vi.fn(),
  resetLearning: vi.fn(),
}));
vi.mock("@/lib/companion-store", () => ({ useSessionUser: () => h.session }));
vi.mock("@/lib/progress", () => ({ resetProgressStore: h.resetProgress }));
vi.mock("@/lib/learning-sync", () => ({ resetLearningSync: h.resetLearning }));

import { DeviceOwnerGuard } from "./DeviceOwnerGuard";

const OWNER = "lamppost-device-owner-v1";
const replace = vi.fn();

beforeEach(() => {
  localStorage.clear();
  h.session.userId = null;
  vi.clearAllMocks();
  vi.stubGlobal("location", { ...window.location, replace });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DeviceOwnerGuard", () => {
  it("leaves a signed-out device alone", () => {
    localStorage.setItem("lamppost-progress-v1", "{}");
    render(<DeviceOwnerGuard />);
    expect(localStorage.getItem("lamppost-progress-v1")).toBe("{}");
    expect(localStorage.getItem(OWNER)).toBeNull();
  });

  it("carries a guest's progress into the account they sign in to", () => {
    localStorage.setItem("lamppost-progress-v1", "{}");
    h.session.userId = "user-1";
    render(<DeviceOwnerGuard />);
    expect(localStorage.getItem(OWNER)).toBe("user-1");
    expect(localStorage.getItem("lamppost-progress-v1")).toBe("{}");
    expect(replace).not.toHaveBeenCalled();
  });

  it("keeps the progress of the person it belongs to when they sign in again", () => {
    localStorage.setItem(OWNER, "user-1");
    localStorage.setItem("lamppost-progress-v1", "{}");
    h.session.userId = "user-1";
    render(<DeviceOwnerGuard />);
    expect(localStorage.getItem("lamppost-progress-v1")).toBe("{}");
    expect(replace).not.toHaveBeenCalled();
  });

  it("clears another account's progress before a different person's account loads", () => {
    localStorage.setItem(OWNER, "user-1");
    localStorage.setItem("lamppost-progress-v1", "{}");
    localStorage.setItem("lamppost-review-drills-v1", "{}");
    localStorage.setItem("other-site", "keep");
    h.session.userId = "user-2";
    render(<DeviceOwnerGuard />);
    expect(localStorage.getItem("lamppost-progress-v1")).toBeNull();
    expect(localStorage.getItem("lamppost-review-drills-v1")).toBeNull();
    expect(localStorage.getItem("other-site")).toBe("keep");
    expect(localStorage.getItem(OWNER)).toBe("user-2");
    expect(h.resetProgress).toHaveBeenCalledTimes(1);
    expect(h.resetLearning).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/");
  });
});
