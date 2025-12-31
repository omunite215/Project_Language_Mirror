"use client";

import { useRef, useEffect } from "react";
import { Box, Typography, Paper, Avatar, Chip, useTheme, IconButton } from "@mui/material";
import { VolumeUp, Person, AutoAwesome } from "@mui/icons-material";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { playAudioBase64 } from "@/lib/api";

interface Props {
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
  languageFlag?: string;
  isNew?: boolean;
}

export default function ChatMessage({
  type,
  content,
  tutorName,
  tutorRegion,
  languageFlag,
  isNew = false,
}: Props) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const correctionRef = useRef<HTMLDivElement>(null);

  // Entrance animation
  useGSAP(() => {
    if (!containerRef.current || !isNew) return;

    const direction = type === "user" ? 50 : -50;

    gsap.fromTo(
      containerRef.current,
      { opacity: 0, x: direction, scale: 0.95 },
      { opacity: 1, x: 0, scale: 1, duration: 0.4, ease: "back.out(2)" },
    );
  }, [isNew, type]);

  // Correction highlight animation
  useGSAP(() => {
    if (!correctionRef.current || !content.correction || content.correction === "Perfect!") return;

    gsap.fromTo(
      correctionRef.current,
      { backgroundColor: "rgba(239, 68, 68, 0.3)" },
      {
        backgroundColor: "rgba(239, 68, 68, 0)",
        duration: 1.5,
        delay: 0.5,
        ease: "power2.out",
      },
    );
  }, [content.correction]);

  const handlePlayAudio = async () => {
    if (content.audioBase64) {
      try {
        await playAudioBase64(content.audioBase64);
      } catch (err) {
        console.error("Audio playback failed:", err);
      }
    }
  };

  const isUser = type === "user";
  const showCorrection = content.correction && content.correction !== "Perfect!";
  const isPerfect = content.correction === "Perfect!";

  return (
    <Box
      ref={containerRef}
      sx={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        gap: { xs: 1.5, sm: 2 },
        maxWidth: { xs: "95%", sm: "85%" },
        alignSelf: isUser ? "flex-end" : "flex-start",
      }}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          bgcolor: isUser ? theme.palette.primary.main : theme.palette.secondary.main,
          width: { xs: 36, sm: 44 },
          height: { xs: 36, sm: 44 },
          flexShrink: 0,
          fontSize: { xs: "1rem", sm: "1.25rem" },
        }}
      >
        {isUser ? <Person /> : languageFlag || "🎓"}
      </Avatar>

      {/* Message content */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {/* Tutor name */}
        {!isUser && tutorName && (
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {tutorName} • {tutorRegion}
          </Typography>
        )}

        {/* Reaction (tutor only) */}
        {!isUser && content.reaction && (
          <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary" }}>
            {content.reaction}
          </Typography>
        )}

        {/* Main message bubble */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: isUser
              ? theme.palette.primary.main
              : theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.03)",
            color: isUser ? "white" : "text.primary",
            borderTopRightRadius: isUser ? 4 : 24,
            borderTopLeftRadius: isUser ? 24 : 4,
          }}
        >
          <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
            {content.native}
          </Typography>

          {/* English translation */}
          {content.english && (
            <Typography
              variant="body2"
              sx={{
                mt: 1.5,
                pt: 1.5,
                borderTop: `1px solid ${isUser ? "rgba(255,255,255,0.2)" : theme.palette.divider}`,
                color: isUser ? "rgba(255,255,255,0.8)" : "text.secondary",
                fontStyle: "italic",
              }}
            >
              {content.english}
            </Typography>
          )}

          {/* Audio play button (tutor only) */}
          {!isUser && content.audioBase64 && (
            <IconButton
              onClick={handlePlayAudio}
              size="small"
              sx={{
                mt: 1,
                bgcolor: "primary.main",
                color: "white",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              <VolumeUp fontSize="small" />
            </IconButton>
          )}
        </Paper>

        {/* Correction box (for user messages) */}
        {isUser && showCorrection && (
          <Box
            ref={correctionRef}
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(239, 68, 68, 0.1)"
                  : "rgba(239, 68, 68, 0.05)",
              border: `1px solid ${theme.palette.error.main}30`,
            }}
          >
            <Typography variant="body2" color="error.main" fontWeight={500}>
              💡 Correction
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {content.correction}
            </Typography>
          </Box>
        )}

        {/* Perfect badge */}
        {isUser && isPerfect && (
          <Chip
            icon={<AutoAwesome sx={{ fontSize: 16 }} />}
            label="Perfect!"
            color="success"
            size="small"
            sx={{ alignSelf: "flex-start" }}
          />
        )}

        {/* Cultural note (tutor only) */}
        {!isUser && content.culturalNote && (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(99, 102, 241, 0.1)"
                  : "rgba(99, 102, 241, 0.05)",
              border: `1px solid ${theme.palette.primary.main}30`,
            }}
          >
            <Typography variant="body2" color="primary.main" fontWeight={500}>
              🎭 Cultural Note
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {content.culturalNote}
            </Typography>
          </Box>
        )}

        {/* Encouragement (tutor only) */}
        {!isUser && content.encouragement && (
          <Typography variant="body2" color="success.main" fontWeight={500}>
            {content.encouragement}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
