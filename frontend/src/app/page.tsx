"use client";

import { useRef, useState, useCallback } from "react";
import { Box, Container, Typography, useTheme, useMediaQuery } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelector from "@/components/LanguageSelector";
import TutorCard from "@/components/TutorCard";
import AudioRecorder from "@/components/AudioRecorder";
import ProgressIndicator from "@/components/ProgressIndicator";
import ConversationPanel, { Message } from "@/components/ConversationPanel";
import ErrorToast from "@/components/ErrorToast";
import {
  fetchLanguages,
  startConversation,
  playAudioBase64,
  ProgressEvent,
  AnalysisEvent,
  CompleteEvent,
  ConversationMessage,
} from "@/lib/api";

gsap.registerPlugin(useGSAP);

export default function Home() {
  const theme = useTheme();

  const isDesktop = useMediaQuery(theme.breakpoints.up("lg")); // >= 1024px

  // State
  const [language, setLanguage] = useState("italian");
  const [dialect, setDialect] = useState("tuscan");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAudioBlob, setLastAudioBlob] = useState<Blob | null>(null);

  // Refs for animations
  const headerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Fetch languages
  const { data: languages } = useQuery({
    queryKey: ["languages"],
    queryFn: fetchLanguages,
  });

  const currentLangFlag = languages?.[language]?.flag || "🌍";

  // Page entrance animation
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(headerRef.current, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.6 })
      .fromTo(
        titleRef.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.5 },
        "-=0.3",
      )
      .fromTo(mainRef.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6 }, "-=0.2");
  }, []);

  // Handle language/dialect change
  const handleLanguageChange = useCallback((lang: string, dial: string) => {
    setMessages([]);
    setLanguage(lang);
    setDialect(dial);
    setError(null);
  }, []);

  // Get conversation history for API
  const getConversationHistory = useCallback((): ConversationMessage[] => {
    const history: ConversationMessage[] = [];
    for (let i = 0; i < messages.length; i += 2) {
      const userMsg = messages[i];
      const tutorMsg = messages[i + 1];
      if (userMsg && tutorMsg) {
        history.push({
          user: userMsg.content.native,
          tutor: tutorMsg.content.native,
          tutor_name: tutorMsg.tutorName || "",
        });
      }
    }
    return history;
  }, [messages]);

  // Handle recording complete
  const handleRecordingComplete = useCallback(
    (audioBlob: Blob) => {
      setLastAudioBlob(audioBlob);
      setIsProcessing(true);
      setError(null);
      setProgress({ step: "receiving", message: "🎤 Receiving audio...", progress: 5 });

      const history = getConversationHistory();

      startConversation(audioBlob, language, dialect, history, {
        onProgress: (data) => {
          setProgress(data);
        },
        onTranscript: (transcript) => {
          const userMsg: Message = {
            id: `user-${Date.now()}`,
            type: "user",
            content: { native: transcript },
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, userMsg]);
        },
        onAnalysis: (data: AnalysisEvent) => {
          setMessages((prev) => {
            const updated = [...prev];
            const lastUserIdx = updated.length - 1;
            if (updated[lastUserIdx]?.type === "user") {
              updated[lastUserIdx] = {
                ...updated[lastUserIdx],
                content: {
                  ...updated[lastUserIdx].content,
                  correction: data.correction,
                },
              };
            }
            return updated;
          });
        },
        onComplete: async (data: CompleteEvent) => {
          setIsProcessing(false);
          setProgress(null);

          const tutorMsg: Message = {
            id: `tutor-${Date.now()}`,
            type: "tutor",
            content: {
              native: data.response_native,
              english: data.response_english,
              reaction: data.reaction,
              encouragement: data.encouragement,
              culturalNote: data.cultural_note,
              audioBase64: data.audio_base64,
            },
            tutorName: data.tutor_name,
            tutorRegion: data.tutor_region,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, tutorMsg]);

          if (data.audio_base64) {
            setIsPlaying(true);
            try {
              await playAudioBase64(data.audio_base64);
            } catch (err) {
              console.error("Audio playback failed:", err);
            }
            setIsPlaying(false);
          }
        },
        onError: (errorMsg) => {
          setIsProcessing(false);
          setProgress(null);
          setError(errorMsg);
          console.error("Conversation error:", errorMsg);
        },
      });
    },
    [language, dialect, getConversationHistory],
  );

  // Retry last recording
  const handleRetry = useCallback(() => {
    if (lastAudioBlob) {
      setError(null);
      handleRecordingComplete(lastAudioBlob);
    }
  }, [lastAudioBlob, handleRecordingComplete]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Error Toast */}
      {error && (
        <ErrorToast
          message={error}
          type="error"
          onClose={() => setError(null)}
          onRetry={lastAudioBlob ? handleRetry : undefined}
        />
      )}

      {/* Header */}
      <Box
        ref={headerRef}
        component="header"
        sx={{
          py: { xs: 1.5, sm: 2 },
          px: { xs: 2, sm: 3 },
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.8)",
          backdropFilter: "blur(20px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <Container maxWidth="2xl" disableGutters sx={{ px: { xs: 0, sm: 1 } }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: { xs: 1, sm: 2 },
              flexWrap: "wrap",
            }}
          >
            <Typography
              ref={titleRef}
              variant="h5"
              fontWeight={800}
              sx={{
                fontSize: { xs: "1.1rem", sm: "1.25rem", md: "1.5rem" },
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Language Mirror
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}>
              <LanguageSelector
                selectedLanguage={language}
                selectedDialect={dialect}
                onSelect={handleLanguageChange}
              />
              <ThemeToggle />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main content */}
      <Box ref={mainRef} component="main" sx={{ flex: 1, py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="2xl" disableGutters sx={{ px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr", // Mobile: single column
                md: "1fr", // Tablet: single column
                lg: "1fr 380px", // Desktop: conversation + sidebar
                xl: "1fr 420px", // Large: wider sidebar
                "2xl": "1fr 480px", // Extra large: even wider sidebar
              },
              gap: { xs: 2, sm: 3, lg: 4 },
              minHeight: { xs: "auto", lg: "calc(100vh - 140px)" },
            }}
          >
            {/* Left: Conversation */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: { xs: 2, sm: 3 },
                order: { xs: 2, lg: 1 }, // On mobile, show after controls
                minHeight: { xs: 400, sm: 500, lg: "auto" },
              }}
            >
              <ConversationPanel
                messages={messages}
                isLoading={isProcessing}
                languageFlag={currentLangFlag}
              />

              {/* Progress indicator - only show on desktop here */}
              {isDesktop && (
                <ProgressIndicator
                  step={progress?.step || ""}
                  message={progress?.message || ""}
                  progress={progress?.progress || 0}
                  visible={isProcessing}
                />
              )}
            </Box>

            {/* Right: Controls */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: { xs: 2, sm: 3 },
                order: { xs: 1, lg: 2 }, // On mobile, show first
                position: { xs: "relative", lg: "sticky" },
                top: { lg: 100 },
                height: "fit-content",
              }}
            >
              {/* Tutor card */}
              <TutorCard
                language={language}
                dialect={dialect}
                languageFlag={currentLangFlag}
                isActive={isPlaying}
              />

              {/* Progress indicator - show here on mobile/tablet */}
              {!isDesktop && (
                <ProgressIndicator
                  step={progress?.step || ""}
                  message={progress?.message || ""}
                  progress={progress?.progress || 0}
                  visible={isProcessing}
                />
              )}

              {/* Audio recorder */}
              <Box
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderRadius: 4,
                  bgcolor:
                    theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <AudioRecorder
                  onRecordingComplete={handleRecordingComplete}
                  isProcessing={isProcessing}
                  isPlaying={isPlaying}
                />
              </Box>

              {/* Quick tips - hide on very small screens */}
              <Box
                sx={{
                  display: { xs: "none", sm: "block" },
                  p: 2,
                  borderRadius: 3,
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "rgba(99, 102, 241, 0.1)"
                      : "rgba(99, 102, 241, 0.05)",
                  border: `1px solid ${theme.palette.primary.main}20`,
                }}
              >
                <Typography variant="caption" color="primary.main" fontWeight={600}>
                  💡 Quick Tips
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mt: 0.5 }}
                >
                  Speak naturally in {languages?.[language]?.name || "your target language"}. Your
                  tutor will correct mistakes and help you improve!
                </Typography>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Mobile bottom padding for safe area */}
      <Box sx={{ height: { xs: "env(safe-area-inset-bottom, 16px)", sm: 0 } }} />
    </Box>
  );
}
