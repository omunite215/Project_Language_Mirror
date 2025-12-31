"use client";

import { useRef, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Skeleton,
  IconButton,
  useTheme,
  CircularProgress,
} from "@mui/material";
import { VolumeUp } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { fetchGreeting, playAudioBase64 } from "@/lib/api";

interface Props {
  language: string;
  dialect: string;
  languageFlag: string;
  isActive?: boolean;
}

export default function TutorCard({ language, dialect, languageFlag, isActive }: Props) {
  const theme = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Fetch greeting WITHOUT audio (saves quota)
  const { data: greeting, isLoading } = useQuery({
    queryKey: ["greeting", language, dialect],
    queryFn: () => fetchGreeting(language, dialect, false), // No audio
    enabled: !!language && !!dialect,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  useGSAP(() => {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(2)" },
    );
  }, [language, dialect]);

  useGSAP(() => {
    if (!avatarRef.current) return;
    if (isActive) {
      gsap.to(avatarRef.current, {
        scale: 1.05,
        boxShadow: `0 0 30px ${theme.palette.primary.main}`,
        duration: 0.3,
      });
    } else {
      gsap.to(avatarRef.current, {
        scale: 1,
        boxShadow: "none",
        duration: 0.3,
      });
    }
  }, [isActive, theme]);

  // Fetch audio ONLY when play button is clicked
  const handlePlayGreeting = async () => {
    setIsLoadingAudio(true);
    try {
      // Fetch with audio this time
      const greetingWithAudio = await fetchGreeting(language, dialect, true);
      if (greetingWithAudio?.audio_base64) {
        await playAudioBase64(greetingWithAudio.audio_base64);
      }
    } catch (err) {
      console.error("Failed to play greeting:", err);
    }
    setIsLoadingAudio(false);
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, borderRadius: 4, display: "flex", gap: 2, alignItems: "center" }}>
        <Skeleton variant="circular" width={64} height={64} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width={120} />
          <Skeleton variant="text" width={180} />
          <Skeleton variant="text" width="100%" />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      ref={cardRef}
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 4,
        display: "flex",
        gap: 3,
        alignItems: "flex-start",
        bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box
        ref={avatarRef}
        sx={{
          width: 64,
          height: 64,
          borderRadius: 3,
          bgcolor: theme.palette.primary.main,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          flexShrink: 0,
        }}
      >
        {languageFlag}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <Typography variant="h6" fontWeight={700}>
            {greeting?.tutor_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • {greeting?.region}
          </Typography>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {greeting?.personality}
        </Typography>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
            display: "flex",
            alignItems: "flex-start",
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={500}>
              {greeting?.greeting_native}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {greeting?.greeting_english}
            </Typography>
          </Box>
          <IconButton
            onClick={handlePlayGreeting}
            disabled={isLoadingAudio}
            size="small"
            sx={{
              bgcolor: "primary.main",
              color: "white",
              "&:hover": { bgcolor: "primary.dark" },
              "&:disabled": { bgcolor: "primary.main", opacity: 0.7 },
            }}
          >
            {isLoadingAudio ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <VolumeUp fontSize="small" />
            )}
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}
