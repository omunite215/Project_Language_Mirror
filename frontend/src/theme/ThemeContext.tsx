"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ThemeProvider as MUIThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import EmotionCacheProvider from "@/lib/EmotionCache";
import { darkTheme, lightTheme } from "./theme";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedMode: "light" | "dark";
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "dark",
  setMode: () => {},
  resolvedMode: "dark",
  mounted: false,
});

export const useThemeMode = () => {
  return useContext(ThemeContext);
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  const getSystemTheme = useCallback((): "light" | "dark" => {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }, []);

  const resolveTheme = useCallback(
    (m: ThemeMode): "light" | "dark" => {
      if (m === "system") return getSystemTheme();
      return m;
    },
    [getSystemTheme],
  );

  useEffect(() => {
    const stored = localStorage.getItem("theme-mode") as ThemeMode | null;
    const initial = stored || "dark";
    setModeState(initial);
    setResolvedMode(resolveTheme(initial));
    setMounted(true);
  }, [resolveTheme]);

  useEffect(() => {
    if (mode !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolvedMode(getSystemTheme());

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode, getSystemTheme]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    setResolvedMode(resolveTheme(newMode));
    localStorage.setItem("theme-mode", newMode);
  };

  // Always render with dark theme first to match server
  const currentTheme = mounted ? (resolvedMode === "dark" ? darkTheme : lightTheme) : darkTheme;

  return (
    <EmotionCacheProvider>
      <ThemeContext.Provider value={{ mode, setMode, resolvedMode, mounted }}>
        <MUIThemeProvider theme={currentTheme}>
          <CssBaseline />
          {children}
        </MUIThemeProvider>
      </ThemeContext.Provider>
    </EmotionCacheProvider>
  );
}
