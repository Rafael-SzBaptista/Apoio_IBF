import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "apoio-theme";

export function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

/** Evita flash de tema errado no primeiro paint. */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    applyTheme(next);
  };

  return { theme, setTheme };
}
