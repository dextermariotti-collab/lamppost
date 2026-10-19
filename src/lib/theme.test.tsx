// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_KEY, THEME_SCRIPT, ThemeProvider, useTheme } from "./theme";

const runHeadScript = () => new Function(THEME_SCRIPT)();
const root = document.documentElement;

function Probe() {
  const { theme, setTheme } = useTheme();
  return (
    <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {theme}
    </button>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  root.classList.remove("dark");
  root.style.colorScheme = "";
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the theme", () => {
  it("is applied by the head script before the app renders, so a dark page never flashes light", () => {
    window.localStorage.setItem(THEME_KEY, "dark");
    runHeadScript();
    expect(root.classList.contains("dark")).toBe(true);
    expect(root.style.colorScheme).toBe("dark");

    window.localStorage.setItem(THEME_KEY, "light");
    runHeadScript();
    expect(root.classList.contains("dark")).toBe(false);
    expect(root.style.colorScheme).toBe("light");
  });

  it("falls back to the device's preference when nothing is saved, in the script and the app alike", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never;
    runHeadScript();
    expect(root.classList.contains("dark")).toBe(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button").textContent).toBe("dark");
  });

  it("still loads when the browser blocks storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
    expect(runHeadScript).not.toThrow();
    expect(root.classList.contains("dark")).toBe(false);

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    const button = screen.getByRole("button");
    expect(button.textContent).toBe("light");
    act(() => button.click());
    expect(button.textContent).toBe("dark");
    expect(root.classList.contains("dark")).toBe(true);
  });
});
