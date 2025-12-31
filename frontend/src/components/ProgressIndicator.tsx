"use client";

import { useRef, useEffect } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

interface Props {
  step: string;
  message: string;
  progress: number;
  visible: boolean;
}

const steps = [
  { key: "receiving", icon: "🎤" },
  { key: "transcribing", icon: "📝" },
  { key: "analyzing", icon: "🤔" },
  { key: "translating", icon: "🌐" },
  { key: "synthesizing", icon: "🗣️" },
  { key: "complete", icon: "✅" },
];

export default function ProgressIndicator({ step, message, progress, visible }: Props) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Container entrance/exit
  useGSAP(() => {
    if (!containerRef.current) return;

    if (visible) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 30, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(2)" },
      );
    } else {
      gsap.to(containerRef.current, {
        opacity: 0,
        y: -20,
        scale: 0.95,
        duration: 0.3,
        ease: "power2.in",
      });
    }
  }, [visible]);

  // Progress bar animation
  useGSAP(() => {
    if (!barRef.current) return;
    gsap.to(barRef.current, {
      width: `${progress}%`,
      duration: 0.5,
      ease: "power2.out",
    });
  }, [progress]);

  // Message animation on change
  useGSAP(() => {
    if (!messageRef.current || !message) return;
    gsap.fromTo(
      messageRef.current,
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" },
    );
  }, [message]);

  // Step icons animation
  useGSAP(() => {
    const currentIdx = steps.findIndex((s) => s.key === step);

    stepsRef.current.forEach((el, i) => {
      if (!el) return;

      if (i < currentIdx) {
        gsap.to(el, { scale: 0.8, opacity: 0.5, duration: 0.2 });
      } else if (i === currentIdx) {
        gsap.to(el, {
          scale: 1.2,
          opacity: 1,
          duration: 0.3,
          ease: "back.out(3)",
        });
        gsap.to(el, {
          y: -5,
          duration: 0.5,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut",
        });
      } else {
        gsap.killTweensOf(el);
        gsap.to(el, { scale: 1, opacity: 0.3, y: 0, duration: 0.2 });
      }
    });
  }, [step]);

  if (!visible) return null;

  return (
    <Box
      ref={containerRef}
      sx={{
        p: 3,
        borderRadius: 4,
        bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Step icons */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        {steps.map((s, i) => (
          <Box
            key={s.key}
            ref={(el) => {
              stepsRef.current[i] = el as HTMLDivElement;
            }}
            sx={{
              fontSize: 24,
              opacity: 0.3,
              transition: "transform 0.2s",
            }}
          >
            {s.icon}
          </Box>
        ))}
      </Box>

      {/* Progress bar */}
      <Box
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          overflow: "hidden",
          mb: 2,
        }}
      >
        <Box
          ref={barRef}
          sx={{
            height: "100%",
            width: 0,
            borderRadius: 3,
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            boxShadow: `0 0 20px ${theme.palette.primary.main}`,
          }}
        />
      </Box>

      {/* Message */}
      <Box ref={messageRef}>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {message}
        </Typography>
      </Box>
    </Box>
  );
}
