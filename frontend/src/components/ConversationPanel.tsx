"use client";

import { useRef, useEffect } from "react";
import { Box, Typography, Skeleton, useTheme } from "@mui/material";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ChatMessage from "./ChatMessage";

export interface Message {
  id: string;
  type: "user" | "tutor";
  content: {
    native: string;
    english?: string;
    reaction?: string;
    correction?: string;
    encouragement?: string;
    culturalNote?: string;
    audioBase64?: string;
  };
  tutorName?: string;
  tutorRegion?: string;
  timestamp: Date;
}

interface Props {
  messages: Message[];
  isLoading?: boolean;
  languageFlag?: string;
}

export default function ConversationPanel({ messages, isLoading, languageFlag }: Props) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const emptyStateRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Empty state animation
  useGSAP(() => {
    if (!emptyStateRef.current || messages.length > 0) return;

    gsap.fromTo(
      emptyStateRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
    );

    // Floating animation
    gsap.to(emptyStateRef.current.querySelector(".float-icon"), {
      y: -10,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
    });
  }, [messages.length]);

  // Container entrance
  useGSAP(() => {
    if (!containerRef.current) return;

    gsap.fromTo(
      containerRef.current,
      { opacity: 0, scale: 0.98 },
      { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" },
    );
  }, []);

  return (
    <Box
      ref={containerRef}
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        borderRadius: 4,
        bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
        border: `1px solid ${theme.palette.divider}`,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
        }}
      >
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
        >
          Conversation • {messages.length} message{messages.length !== 1 ? "s" : ""}
        </Typography>
      </Box>

      {/* Messages area */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          p: { xs: 2, sm: 3 },
          display: "flex",
          flexDirection: "column",
          gap: { xs: 2, sm: 3 },
        }}
      >
        {messages.length === 0 && !isLoading ? (
          <Box
            ref={emptyStateRef}
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              py: 8,
            }}
          >
            <Typography className="float-icon" variant="h1" sx={{ fontSize: 64, opacity: 0.8 }}>
              🎤
            </Typography>
            <Typography variant="h6" color="text.secondary" textAlign="center">
              Start speaking to begin your lesson
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={300}>
              Your tutor is ready to help you practice. Tap the microphone and say something in your
              target language!
            </Typography>
          </Box>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <ChatMessage
                key={msg.id}
                type={msg.type}
                content={msg.content}
                tutorName={msg.tutorName}
                tutorRegion={msg.tutorRegion}
                languageFlag={languageFlag}
                isNew={idx === messages.length - 1 || idx === messages.length - 2}
              />
            ))}

            {/* Loading skeleton */}
            {isLoading && (
              <Box sx={{ display: "flex", gap: 2, maxWidth: "85%" }}>
                <Skeleton variant="circular" width={44} height={44} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width={120} sx={{ mb: 1 }} />
                  <Skeleton variant="rounded" height={80} sx={{ borderRadius: 3 }} />
                  <Skeleton variant="text" width="60%" sx={{ mt: 1 }} />
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
