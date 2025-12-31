"use client";

import { useRef } from "react";
import { Box, Typography, Button, Container, useTheme } from "@mui/material";
import { Home, Translate } from "@mui/icons-material";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";

export default function NotFound() {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // Entrance animations
    tl.fromTo(
      numberRef.current,
      { opacity: 0, scale: 0.5, rotationX: -90 },
      { opacity: 1, scale: 1, rotationX: 0, duration: 0.8, ease: "back.out(2)" },
    )
      .fromTo(textRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, "-=0.3")
      .fromTo(
        buttonRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5 },
        "-=0.2",
      );

    // Floating animation for decorative elements
    if (floatingRef.current) {
      const emojis = floatingRef.current.children;
      gsap.fromTo(
        emojis,
        { opacity: 0, scale: 0 },
        {
          opacity: 0.6,
          scale: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: "back.out(2)",
          delay: 0.5,
        },
      );

      // Continuous floating
      Array.from(emojis).forEach((emoji, i) => {
        gsap.to(emoji, {
          y: -20 + Math.random() * 40,
          x: -10 + Math.random() * 20,
          rotation: -10 + Math.random() * 20,
          duration: 2 + Math.random() * 2,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut",
          delay: i * 0.2,
        });
      });
    }

    // Glitch effect on 404
    const glitchTl = gsap.timeline({ repeat: -1, repeatDelay: 5 });
    glitchTl
      .to(numberRef.current, {
        skewX: 5,
        duration: 0.1,
        ease: "power1.inOut",
      })
      .to(numberRef.current, {
        skewX: -3,
        duration: 0.1,
        ease: "power1.inOut",
      })
      .to(numberRef.current, {
        skewX: 0,
        duration: 0.1,
        ease: "power1.inOut",
      });
  }, []);

  const floatingEmojis = ["🇮🇹", "🇪🇸", "🇫🇷", "🇩🇪", "🇯🇵", "🎤", "💬", "🗣️"];

  return (
    <Box
      ref={containerRef}
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Floating emojis background */}
      <Box
        ref={floatingRef}
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {floatingEmojis.map((emoji, i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              fontSize: { xs: 32, sm: 48 },
              opacity: 0,
              top: `${10 + Math.random() * 80}%`,
              left: `${5 + Math.random() * 90}%`,
            }}
          >
            {emoji}
          </Box>
        ))}
      </Box>

      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
        <Box sx={{ textAlign: "center" }}>
          {/* 404 Number */}
          <Box ref={numberRef}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: "8rem", sm: "12rem", md: "14rem" },
                fontWeight: 900,
                lineHeight: 1,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 50%, ${theme.palette.error.main} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "none",
                mb: 2,
              }}
            >
              404
            </Typography>
          </Box>

          {/* Text content */}
          <Box ref={textRef}>
            <Typography
              variant="h4"
              fontWeight={700}
              color="text.primary"
              gutterBottom
              sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
            >
              Lost in Translation
            </Typography>

            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                mb: 4,
                maxWidth: 400,
                mx: "auto",
                fontSize: { xs: "0.95rem", sm: "1.1rem" },
              }}
            >
              Looks like this page doesn&apos;t exist in any language! Let&apos;s get you back to
              practicing.
            </Typography>

            {/* Fun phrases in different languages */}
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 1,
                mb: 4,
              }}
            >
              {[
                { flag: "🇮🇹", text: "Pagina non trovata" },
                { flag: "🇪🇸", text: "Página no encontrada" },
                { flag: "🇫🇷", text: "Page non trouvée" },
                { flag: "🇩🇪", text: "Seite nicht gefunden" },
                { flag: "🇯🇵", text: "ページが見つかりません" },
              ].map((phrase, i) => (
                <Box
                  key={i}
                  sx={{
                    px: 2,
                    py: 0.75,
                    borderRadius: 2,
                    bgcolor:
                      theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    border: `1px solid ${theme.palette.divider}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    fontSize: "0.85rem",
                  }}
                >
                  <span>{phrase.flag}</span>
                  <Typography variant="caption" color="text.secondary">
                    {phrase.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Buttons */}
          <Box
            ref={buttonRef}
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              justifyContent: "center",
            }}
          >
            <Button
              component={Link}
              href="/"
              variant="contained"
              size="large"
              startIcon={<Home />}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 3,
                fontSize: "1rem",
                boxShadow: `0 8px 30px ${theme.palette.primary.main}40`,
                "&:hover": {
                  boxShadow: `0 12px 40px ${theme.palette.primary.main}60`,
                },
              }}
            >
              Back to Home
            </Button>

            <Button
              component={Link}
              href="/"
              variant="outlined"
              size="large"
              startIcon={<Translate />}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 3,
                fontSize: "1rem",
                borderWidth: 2,
                "&:hover": {
                  borderWidth: 2,
                },
              }}
            >
              Start Learning
            </Button>
          </Box>

          {/* Tutor quote */}
          <Box
            sx={{
              mt: 6,
              p: 3,
              borderRadius: 3,
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(99, 102, 241, 0.1)"
                  : "rgba(99, 102, 241, 0.05)",
              border: `1px solid ${theme.palette.primary.main}20`,
              maxWidth: 400,
              mx: "auto",
            }}
          >
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              &ldquo;Even getting lost is part of the journey. Now let&apos;s get you back on
              track!&rdquo;
            </Typography>
            <Typography
              variant="caption"
              color="primary.main"
              fontWeight={600}
              sx={{ display: "block", mt: 1 }}
            >
              — Sofia, your Italian tutor 🇮🇹
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
