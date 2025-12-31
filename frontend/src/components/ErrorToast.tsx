"use client";

import { useRef, useEffect } from "react";
import { Box, Typography, IconButton, useTheme } from "@mui/material";
import { Close, ErrorOutline, WarningAmber, Refresh } from "@mui/icons-material";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export interface ErrorToastProps {
  message: string;
  type?: "error" | "warning";
  onClose: () => void;
  onRetry?: () => void;
  autoHideDuration?: number;
}

export default function ErrorToast({
  message,
  type = "error",
  onClose,
  onRetry,
  autoHideDuration = 8000,
}: ErrorToastProps) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Entrance animation
  useGSAP(() => {
    if (!containerRef.current) return;

    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: -20, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(2)" },
    );

    // Progress bar countdown
    if (progressRef.current && autoHideDuration > 0) {
      gsap.fromTo(
        progressRef.current,
        { width: "100%" },
        { width: "0%", duration: autoHideDuration / 1000, ease: "linear" },
      );
    }
  }, []);

  // Auto-hide
  useEffect(() => {
    if (autoHideDuration <= 0) return;

    const timer = setTimeout(() => {
      handleClose();
    }, autoHideDuration);

    return () => clearTimeout(timer);
  }, [autoHideDuration]);

  const handleClose = () => {
    if (!containerRef.current) {
      onClose();
      return;
    }

    gsap.to(containerRef.current, {
      opacity: 0,
      y: -20,
      scale: 0.95,
      duration: 0.3,
      ease: "power2.in",
      onComplete: onClose,
    });
  };

  const colors = {
    error: {
      bg: theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)",
      border: theme.palette.error.main,
      icon: theme.palette.error.main,
    },
    warning: {
      bg: theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.1)",
      border: theme.palette.warning.main,
      icon: theme.palette.warning.main,
    },
  };

  const color = colors[type];

  // Parse error message to make it user-friendly
  const getUserFriendlyMessage = (msg: string): { title: string; description: string } => {
    const lowerMsg = msg.toLowerCase();

    if (lowerMsg.includes("quota") || lowerMsg.includes("rate limit") || lowerMsg.includes("429")) {
      return {
        title: "Service Busy",
        description: "Too many requests. Please wait a moment and try again.",
      };
    }
    if (
      lowerMsg.includes("network") ||
      lowerMsg.includes("fetch") ||
      lowerMsg.includes("connection")
    ) {
      return {
        title: "Connection Error",
        description: "Unable to connect to server. Check your internet connection.",
      };
    }
    if (lowerMsg.includes("audio") || lowerMsg.includes("microphone")) {
      return {
        title: "Audio Error",
        description: "There was a problem with the audio. Please try recording again.",
      };
    }
    if (lowerMsg.includes("transcri")) {
      return {
        title: "Could Not Understand",
        description: "Speech was unclear. Please speak louder and try again.",
      };
    }
    if (lowerMsg.includes("permission")) {
      return {
        title: "Permission Denied",
        description: "Please allow microphone access in your browser settings.",
      };
    }

    return {
      title: type === "error" ? "Something Went Wrong" : "Warning",
      description: msg.length > 100 ? msg.substring(0, 100) + "..." : msg,
    };
  };

  const { title, description } = getUserFriendlyMessage(message);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: "fixed",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        width: "90%",
        maxWidth: 450,
      }}
    >
      <Box
        sx={{
          bgcolor: color.bg,
          border: `1px solid ${color.border}40`,
          borderRadius: 3,
          overflow: "hidden",
          backdropFilter: "blur(20px)",
          boxShadow: `0 10px 40px ${color.border}20`,
        }}
      >
        {/* Progress bar */}
        <Box
          ref={progressRef}
          sx={{
            height: 3,
            bgcolor: color.border,
            opacity: 0.6,
          }}
        />

        <Box sx={{ p: 2, display: "flex", alignItems: "flex-start", gap: 2 }}>
          {/* Icon */}
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: `${color.border}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {type === "error" ? (
              <ErrorOutline sx={{ color: color.icon }} />
            ) : (
              <WarningAmber sx={{ color: color.icon }} />
            )}
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={600} color="text.primary">
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>

            {/* Retry button */}
            {onRetry && (
              <Box
                onClick={onRetry}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  mt: 1.5,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1.5,
                  bgcolor: color.border,
                  color: "white",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  transition: "opacity 0.2s",
                  "&:hover": { opacity: 0.9 },
                }}
              >
                <Refresh sx={{ fontSize: 16 }} />
                Try Again
              </Box>
            )}
          </Box>

          {/* Close button */}
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{
              color: "text.secondary",
              "&:hover": { bgcolor: `${color.border}20` },
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
