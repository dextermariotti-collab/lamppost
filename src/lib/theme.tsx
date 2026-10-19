import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

export const THEME_KEY = "lamppost-theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

/** The saved choice, else the device's preference. Storage can be blocked (private mode). */
function initialTheme(): Theme {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(THEME_KEY);
  } catch {
    /* fall through to the device's preference */
  }
  if (stored === "light" || stored === "dark") return stored;
  return typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Runs in the page's head before anything is painted, so a dark page never flashes light
 * while the app loads. It makes the same choice as `initialTheme`.
 */
export const THEME_SCRIPT = `(function(){var t=null;try{t=localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)})}catch(e){}if(t!=="light"&&t!=="dark"){try{t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch(e){t="light"}}var d=document.documentElement;d.classList.toggle("dark",t==="dark");d.style.colorScheme=t})()`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const initial = initialTheme();
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    try {
      window.localStorage.setItem(THEME_KEY, nextTheme);
    } catch {
      /* the choice still applies to this visit */
    }
    applyTheme(nextTheme);
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
