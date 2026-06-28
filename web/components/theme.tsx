"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "windows" | "material" | "glass";
export const THEMES: { key: Theme; label: string }[] = [
  { key: "windows", label: "Windows" },
  { key: "material", label: "Material" },
  { key: "glass", label: "Glass" },
];
const STORAGE_KEY = "berichan.theme";
const DEFAULT: Theme = "material";

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: DEFAULT,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT);

  useEffect(() => {
    const stored = (typeof window !== "undefined" &&
      (window.localStorage.getItem(STORAGE_KEY) as Theme)) || DEFAULT;
    setThemeState(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {}
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
