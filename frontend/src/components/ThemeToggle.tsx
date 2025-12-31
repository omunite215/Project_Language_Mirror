"use client";

import { useRef, useState } from "react";
import { Box, IconButton, Paper, Typography, useTheme, Skeleton } from "@mui/material";
import { LightMode, DarkMode, SettingsBrightness } from "@mui/icons-material";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useThemeMode } from "@/theme/ThemeContext";

type ThemeModeValue = "light" | "dark" | "system";

const modes: { value: ThemeModeValue; icon: React.ReactNode; label: string }[] = [
  { value: "light", icon: <LightMode />, label: "Light" },
  { value: "dark", icon: <DarkMode />, label: "Dark" },
  { value: "system", icon: <SettingsBrightness />, label: "System" },
];

export default function ThemeToggle() {
  const { mode, setMode, mounted } = useThemeMode();
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const currentMode = modes.find((m) => m.value === mode) || modes[1];

  useGSAP(() => {
    if (!menuRef.current) return;

    if (open) {
      gsap.fromTo(
        menuRef.current,
        { opacity: 0, scale: 0.9, y: -10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: "back.out(2)" },
      );
      gsap.fromTo(
        itemsRef.current.filter(Boolean),
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.2, stagger: 0.05, ease: "power2.out", delay: 0.1 },
      );
    }
  }, [open]);

  const handleClose = () => {
    if (!menuRef.current) {
      setOpen(false);
      return;
    }

    gsap.to(itemsRef.current.filter(Boolean).reverse(), {
      opacity: 0,
      x: -20,
      duration: 0.15,
      stagger: 0.03,
      ease: "power2.in",
    });
    gsap.to(menuRef.current, {
      opacity: 0,
      scale: 0.9,
      y: -10,
      duration: 0.2,
      ease: "power2.in",
      delay: 0.1,
      onComplete: () => setOpen(false),
    });
  };

  const handleSelect = (value: ThemeModeValue) => {
    setMode(value);
    handleClose();
  };

  // Show skeleton while mounting to prevent hydration mismatch
  if (!mounted) {
    return <Skeleton variant="circular" width={40} height={40} />;
  }

  return (
    <Box ref={containerRef} sx={{ position: "relative" }}>
      <IconButton
        onClick={() => (open ? handleClose() : setOpen(true))}
        sx={{
          bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
          backdropFilter: "blur(10px)",
          border: `1px solid ${theme.palette.divider}`,
          "&:hover": {
            bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          },
        }}
      >
        {currentMode.icon}
      </IconButton>

      {open && (
        <>
          <Box
            onClick={handleClose}
            sx={{
              position: "fixed",
              inset: 0,
              zIndex: 10,
            }}
          />
          <Paper
            ref={menuRef}
            elevation={8}
            sx={{
              position: "absolute",
              top: "100%",
              right: 0,
              mt: 1,
              p: 1,
              minWidth: 140,
              zIndex: 20,
              borderRadius: 3,
            }}
          >
            {modes.map((m, i) => (
              <IconButton
                key={m.value}
                ref={(el) => {
                  itemsRef.current[i] = el;
                }}
                onClick={() => handleSelect(m.value)}
                sx={{
                  width: "100%",
                  justifyContent: "flex-start",
                  gap: 1.5,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: mode === m.value ? "primary.main" : "transparent",
                  color: mode === m.value ? "white" : "text.primary",
                  "&:hover": {
                    bgcolor: mode === m.value ? "primary.dark" : "action.hover",
                  },
                }}
              >
                {m.icon}
                <Typography variant="body2" fontWeight={500}>
                  {m.label}
                </Typography>
              </IconButton>
            ))}
          </Paper>
        </>
      )}
    </Box>
  );
}
