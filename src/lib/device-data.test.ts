// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const reset = vi.hoisted(() => vi.fn());
const resetLearning = vi.hoisted(() => vi.fn());
vi.mock("./progress", () => ({ resetProgressStore: reset }));
vi.mock("./learning-sync", () => ({ resetLearningSync: resetLearning }));

import { clearDeviceData } from "./device-data";

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  reset.mockClear();
  resetLearning.mockClear();
});

describe("clearDeviceData", () => {
  it("removes every Lamppost key in both stores and leaves other sites' keys alone", () => {
    window.localStorage.setItem("lamppost-progress-v1", "{}");
    window.localStorage.setItem("other-app", "keep");
    window.sessionStorage.setItem("lamppost-auth-redirect", "{}");
    window.sessionStorage.setItem("lamppost-lesson-run", "{}");
    window.sessionStorage.setItem("other-tab", "keep");

    clearDeviceData();

    expect(Object.keys(window.localStorage)).toEqual(["other-app"]);
    expect(Object.keys(window.sessionStorage)).toEqual(["other-tab"]);
    expect(reset).toHaveBeenCalledTimes(1);
    // A sync reply still on its way can't write the old reviews back.
    expect(resetLearning).toHaveBeenCalledTimes(1);
  });

  it("still clears local storage and resets when session storage can't be read", () => {
    window.localStorage.setItem("lamppost-progress-v1", "{}");
    const blocked = vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new Error("blocked");
    });

    clearDeviceData();

    blocked.mockRestore();
    expect(window.localStorage.getItem("lamppost-progress-v1")).toBeNull();
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
