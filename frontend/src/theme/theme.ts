"use client";

import { createTheme, ThemeOptions } from "@mui/material/styles";

// Language accent colors
export const languageColors = {
  italian: { primary: "#22c55e", secondary: "#ef4444" },
  spanish: { primary: "#fbbf24", secondary: "#ef4444" },
  french: { primary: "#3b82f6", secondary: "#ef4444" },
  german: { primary: "#fbbf24", secondary: "#1f2937" },
  japanese: { primary: "#ef4444", secondary: "#f8fafc" },
};

// Tailwind CSS breakpoints
const breakpoints = {
  values: {
    xs: 0, // 0px
    sm: 640, // 40rem - Tailwind sm
    md: 768, // 48rem - Tailwind md
    lg: 1024, // 64rem - Tailwind lg
    xl: 1280, // 80rem - Tailwind xl
    "2xl": 1536, // 96rem - Tailwind 2xl (using string key)
  },
};

// Extend module to include 2xl
declare module "@mui/material/styles" {
  interface BreakpointOverrides {
    xs: true;
    sm: true;
    md: true;
    lg: true;
    xl: true;
    "2xl": true;
  }
}

const baseTheme: ThemeOptions = {
  breakpoints,
  typography: {
    fontFamily:
      '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontWeight: 700, letterSpacing: "-0.01em" },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: "none" },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiContainer: {
      defaultProps: {
        maxWidth: "2xl", // Use full width up to 2xl
      },
      styleOverrides: {
        root: {
          paddingLeft: 16,
          paddingRight: 16,
          "@media (min-width: 640px)": {
            paddingLeft: 24,
            paddingRight: 24,
          },
          "@media (min-width: 1024px)": {
            paddingLeft: 32,
            paddingRight: 32,
          },
          "@media (min-width: 1536px)": {
            paddingLeft: 48,
            paddingRight: 48,
          },
        },
        maxWidthXl: {
          maxWidth: "1280px !important",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12, padding: "10px 24px" },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
};

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: "dark",
    primary: { main: "#6366f1", light: "#818cf8", dark: "#4f46e5" },
    secondary: { main: "#22d3ee", light: "#67e8f9", dark: "#06b6d4" },
    background: {
      default: "#09090b",
      paper: "#18181b",
    },
    text: {
      primary: "#f4f4f5",
      secondary: "#a1a1aa",
    },
    success: { main: "#22c55e" },
    error: { main: "#ef4444" },
    warning: { main: "#f59e0b" },
    divider: "rgba(255,255,255,0.08)",
  },
  components: {
    ...baseTheme.components,
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "rgba(24, 24, 27, 0.8)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.06)",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        standardError: {
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
        },
        standardWarning: {
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
        },
        standardSuccess: {
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          border: "1px solid rgba(34, 197, 94, 0.3)",
        },
        standardInfo: {
          backgroundColor: "rgba(99, 102, 241, 0.1)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
        },
      },
    },
  },
});

export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: "light",
    primary: { main: "#4f46e5", light: "#6366f1", dark: "#4338ca" },
    secondary: { main: "#0891b2", light: "#22d3ee", dark: "#0e7490" },
    background: {
      default: "#fafafa",
      paper: "#ffffff",
    },
    text: {
      primary: "#18181b",
      secondary: "#71717a",
    },
    success: { main: "#16a34a" },
    error: { main: "#dc2626" },
    warning: { main: "#d97706" },
    divider: "rgba(0,0,0,0.08)",
  },
  components: {
    ...baseTheme.components,
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(0,0,0,0.06)",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        standardError: {
          backgroundColor: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
        },
        standardWarning: {
          backgroundColor: "rgba(245, 158, 11, 0.08)",
          border: "1px solid rgba(245, 158, 11, 0.2)",
        },
        standardSuccess: {
          backgroundColor: "rgba(34, 197, 94, 0.08)",
          border: "1px solid rgba(34, 197, 94, 0.2)",
        },
        standardInfo: {
          backgroundColor: "rgba(99, 102, 241, 0.08)",
          border: "1px solid rgba(99, 102, 241, 0.2)",
        },
      },
    },
  },
});
