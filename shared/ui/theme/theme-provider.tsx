"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { themes, getThemeById } from "./themes";
import type { ThemePreset } from "./themes";

const STORAGE_KEY = "novel-writer-theme";

interface ThemeContextValue {
  theme: ThemePreset;
  setTheme: (id: string) => void;
  themes: ThemePreset[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) ?? "warm-paper";
    }
    return "warm-paper";
  });

  const theme = useMemo(() => getThemeById(themeId), [themeId]);

  const setTheme = useCallback((id: string) => {
    setThemeId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  // 注入 CSS 变量到 :root
  useEffect(() => {
    const root = document.documentElement;
    const c = theme.colors;
    const v = root.style;
    v.setProperty("--bg-page", c.bgPage);
    v.setProperty("--bg-elevated", c.bgElevated);
    v.setProperty("--bg-muted", c.bgMuted);
    v.setProperty("--bg-strong", c.bgStrong);
    v.setProperty("--text-primary", c.textPrimary);
    v.setProperty("--text-secondary", c.textSecondary);
    v.setProperty("--text-tertiary", c.textTertiary);
    v.setProperty("--text-light", c.textLight);
    v.setProperty("--border", c.border);
    v.setProperty("--border-strong", c.borderStrong);
    v.setProperty("--border-light", c.borderLight);
    v.setProperty("--color-primary", c.primary);
    v.setProperty("--color-primary-hover", c.primaryHover);
    v.setProperty("--color-primary-bg", c.primaryBg);
    v.setProperty("--color-primary-bg-hover", c.primaryBgHover);
    v.setProperty("--color-primary-border", c.primaryBorder);
    v.setProperty("--color-success", c.colorSuccess);
    v.setProperty("--color-warning", c.colorWarning);
    v.setProperty("--color-error", c.colorError);
    v.setProperty("--shadow", c.shadow);
    v.setProperty("--shadow-md", c.shadowMd);
    v.setProperty("--shadow-lg", c.shadowLg);
    v.setProperty("--scrollbar-thumb", c.scrollbarThumb);
    v.setProperty("--scrollbar-thumb-hover", c.scrollbarThumbHover);
    // Aliases — kept for backward compatibility with existing CSS references
    v.setProperty("--accent", c.primary);
    v.setProperty("--primary", c.primary);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme, themes }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
