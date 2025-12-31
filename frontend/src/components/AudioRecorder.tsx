"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Box, IconButton, Typography, useTheme, Alert } from "@mui/material";
import { Mic, Stop, VolumeUp, MicOff } from "@mui/icons-material";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

interface Props {
  onRecordingComplete: (blob: Blob) => void;
  isProcessing: boolean;
  isPlaying: boolean;
  disabled?: boolean;
}

export default function AudioRecorder({
  onRecordingComplete,
  isProcessing,
  isPlaying,
  disabled,
}: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [micSupported, setMicSupported] = useState(true);
  const theme = useTheme();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const pulseRingsRef = useRef<HTMLDivElement>(null);
  const barsContainerRef = useRef<HTMLDivElement>(null);
  const statusTextRef = useRef<HTMLSpanElement>(null);

  // Check microphone support on mount
  useEffect(() => {
    const checkMicSupport = async () => {
      // Check if we're in a browser environment
      if (typeof window === "undefined") {
        setMicSupported(false);
        return;
      }

      // Check if mediaDevices API exists
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicSupported(false);
        setError(
          "Microphone access is not supported in this browser. Please use Chrome, Firefox, or Edge.",
        );
        return;
      }

      // Check if we're on a secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        setMicSupported(false);
        setError(
          "Microphone requires a secure connection (HTTPS). Please use localhost or enable HTTPS.",
        );
        return;
      }

      setMicSupported(true);
    };

    checkMicSupport();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Pulse animation while recording
  useGSAP(() => {
    if (!pulseRingsRef.current) return;
    const rings = pulseRingsRef.current.children;

    if (isRecording) {
      gsap.to(rings, {
        scale: 2,
        opacity: 0,
        duration: 1.5,
        stagger: 0.5,
        repeat: -1,
        ease: "power2.out",
      });
    } else {
      gsap.killTweensOf(rings);
      gsap.set(rings, { scale: 1, opacity: 0 });
    }
  }, [isRecording]);

  // Button state animations
  useGSAP(() => {
    if (!buttonRef.current) return;

    if (isRecording) {
      gsap.to(buttonRef.current, {
        scale: 1.1,
        boxShadow: `0 0 60px ${theme.palette.error.main}`,
        duration: 0.3,
        ease: "back.out(2)",
      });
    } else if (isProcessing) {
      gsap.to(buttonRef.current, {
        scale: 1,
        boxShadow: `0 0 40px ${theme.palette.warning.main}`,
        duration: 0.3,
      });
    } else if (isPlaying) {
      gsap.to(buttonRef.current, {
        scale: 1.05,
        boxShadow: `0 0 50px ${theme.palette.success.main}`,
        duration: 0.3,
      });
    } else {
      gsap.to(buttonRef.current, {
        scale: 1,
        boxShadow: `0 0 30px ${theme.palette.primary.main}`,
        duration: 0.3,
      });
    }
  }, [isRecording, isProcessing, isPlaying, theme]);

  // Audio bars animation
  useGSAP(() => {
    if (!barsContainerRef.current) return;
    const bars = barsContainerRef.current.children;

    if (isRecording || isPlaying) {
      gsap.fromTo(
        bars,
        { scaleY: 0.3 },
        {
          scaleY: 1,
          duration: 0.4,
          stagger: { each: 0.1, repeat: -1, yoyo: true },
          ease: "power1.inOut",
        },
      );
    } else {
      gsap.killTweensOf(bars);
      gsap.to(bars, { scaleY: 0.3, duration: 0.3 });
    }
  }, [isRecording, isPlaying]);

  // Status text animation
  useGSAP(() => {
    if (!statusTextRef.current) return;

    gsap.fromTo(
      statusTextRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
    );
  }, [isRecording, isProcessing, isPlaying]);

  const startRecording = useCallback(async () => {
    // Clear previous errors
    setError(null);

    // Check support again before starting
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Microphone not available. Please check browser permissions.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });

      streamRef.current = stream;

      // Check for supported MIME types
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "audio/mp4";
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ""; // Let browser choose
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        onRecordingComplete(blob);
      };

      mediaRecorder.onerror = (e) => {
        console.error("MediaRecorder error:", e);
        setError("Recording failed. Please try again.");
        setIsRecording(false);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);

      if (err instanceof DOMException) {
        switch (err.name) {
          case "NotAllowedError":
            setError(
              "Microphone permission denied. Please allow microphone access in your browser settings.",
            );
            break;
          case "NotFoundError":
            setError("No microphone found. Please connect a microphone and try again.");
            break;
          case "NotReadableError":
            setError("Microphone is busy or unavailable. Please close other apps using it.");
            break;
          default:
            setError(`Microphone error: ${err.message}`);
        }
      } else {
        setError("Failed to access microphone. Please check your permissions.");
      }
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusText = () => {
    if (!micSupported) return "Microphone not available";
    if (isRecording) return `Recording... ${formatDuration(duration)}`;
    if (isProcessing) return "Processing...";
    if (isPlaying) return "Tutor is speaking...";
    return "Tap to speak";
  };

  const getButtonColor = () => {
    if (!micSupported) return theme.palette.grey[500];
    if (isRecording) return theme.palette.error.main;
    if (isProcessing) return theme.palette.warning.main;
    if (isPlaying) return theme.palette.success.main;
    return theme.palette.primary.main;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, py: 4 }}>
      {/* Error message */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ width: "100%", mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Audio visualization bars */}
      <Box
        ref={barsContainerRef}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          height: 40,
          opacity: isRecording || isPlaying ? 1 : 0.3,
          transition: "opacity 0.3s",
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 4,
              height: "100%",
              bgcolor: getButtonColor(),
              borderRadius: 2,
              transformOrigin: "bottom",
            }}
          />
        ))}
      </Box>

      {/* Main button with pulse rings */}
      <Box
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Pulse rings */}
        <Box
          ref={pulseRingsRef}
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              sx={{
                position: "absolute",
                width: 100,
                height: 100,
                borderRadius: "50%",
                border: `2px solid ${theme.palette.error.main}`,
                opacity: 0,
              }}
            />
          ))}
        </Box>

        {/* Main button */}
        <IconButton
          ref={buttonRef}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || isProcessing || isPlaying || !micSupported}
          sx={{
            width: 100,
            height: 100,
            bgcolor: getButtonColor(),
            color: "white",
            "&:hover": {
              bgcolor: getButtonColor(),
              filter: "brightness(1.1)",
            },
            "&:disabled": {
              bgcolor: getButtonColor(),
              color: "white",
              opacity: 0.7,
            },
          }}
        >
          {!micSupported ? (
            <MicOff sx={{ fontSize: 48 }} />
          ) : isRecording ? (
            <Stop sx={{ fontSize: 48 }} />
          ) : isPlaying ? (
            <VolumeUp sx={{ fontSize: 48 }} />
          ) : (
            <Mic sx={{ fontSize: 48 }} />
          )}
        </IconButton>
      </Box>

      {/* Status text */}
      <Typography
        ref={statusTextRef}
        variant="body1"
        fontWeight={500}
        color="text.secondary"
        sx={{ minHeight: 24, textAlign: "center" }}
      >
        {getStatusText()}
      </Typography>
    </Box>
  );
}
