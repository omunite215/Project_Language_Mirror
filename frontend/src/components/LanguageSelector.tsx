"use client";

import { useRef, useState } from "react";
import { Box, Button, Paper, Typography, Skeleton, useTheme, Chip } from "@mui/material";
import { KeyboardArrowDown, Check } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { fetchLanguages, Language } from "@/lib/api";

interface Props {
  selectedLanguage: string;
  selectedDialect: string;
  onSelect: (language: string, dialect: string) => void;
}

export default function LanguageSelector({ selectedLanguage, selectedDialect, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"language" | "dialect">("language");
  const [tempLanguage, setTempLanguage] = useState(selectedLanguage);
  const theme = useTheme();

  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const arrowRef = useRef<SVGSVGElement>(null);

  const { data: languages, isLoading } = useQuery({
    queryKey: ["languages"],
    queryFn: fetchLanguages,
  });

  const currentLang = languages?.[selectedLanguage];
  const currentDialect = currentLang?.dialects?.[selectedDialect];

  useGSAP(() => {
    if (arrowRef.current) {
      gsap.to(arrowRef.current, {
        rotation: open ? 180 : 0,
        duration: 0.3,
        ease: "power2.out",
      });
    }
  }, [open]);

  useGSAP(() => {
    if (!menuRef.current || !open) return;

    gsap.fromTo(
      menuRef.current,
      { opacity: 0, scale: 0.95, y: -20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "back.out(2)" },
    );

    gsap.fromTo(
      itemsRef.current.filter(Boolean),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.25, stagger: 0.04, ease: "power3.out", delay: 0.1 },
    );
  }, [open, step]);

  const handleClose = (callback?: () => void) => {
    if (!menuRef.current) {
      setOpen(false);
      setStep("language");
      callback?.();
      return;
    }

    gsap.to(itemsRef.current.filter(Boolean), {
      opacity: 0,
      y: -10,
      duration: 0.15,
      stagger: 0.02,
      ease: "power2.in",
    });

    gsap.to(menuRef.current, {
      opacity: 0,
      scale: 0.95,
      y: -20,
      duration: 0.2,
      ease: "power2.in",
      delay: 0.1,
      onComplete: () => {
        setOpen(false);
        setStep("language");
        callback?.();
      },
    });
  };

  const handleLanguageSelect = (langKey: string) => {
    setTempLanguage(langKey);
    setStep("dialect");
    itemsRef.current = [];
  };

  const handleDialectSelect = (dialectKey: string) => {
    handleClose(() => onSelect(tempLanguage, dialectKey));
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Skeleton variant="rounded" width={180} height={48} />
      </Box>
    );
  }

  const items =
    step === "language"
      ? Object.entries(languages || {})
      : Object.entries(languages?.[tempLanguage]?.dialects || {});

  return (
    <Box sx={{ position: "relative" }}>
      <Button
        onClick={() => (open ? handleClose() : setOpen(true))}
        variant="outlined"
        endIcon={<KeyboardArrowDown ref={arrowRef} />}
        sx={{
          borderRadius: 3,
          px: 2.5,
          py: 1.5,
          borderColor: theme.palette.divider,
          bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          "&:hover": {
            borderColor: "primary.main",
            bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="h6" component="span">
            {currentLang?.flag}
          </Typography>
          <Box sx={{ textAlign: "left" }}>
            <Typography variant="body2" fontWeight={600} color="text.primary">
              {currentLang?.name || "Select Language"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentDialect?.name} • {currentDialect?.region}
            </Typography>
          </Box>
        </Box>
      </Button>

      {open && (
        <>
          <Box onClick={() => handleClose()} sx={{ position: "fixed", inset: 0, zIndex: 10 }} />
          <Paper
            ref={menuRef}
            elevation={12}
            sx={{
              position: "absolute",
              top: "100%",
              left: 0,
              mt: 1.5,
              p: 2,
              minWidth: 320,
              maxHeight: 400,
              overflow: "auto",
              zIndex: 20,
              borderRadius: 4,
            }}
          >
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ px: 1, mb: 1.5, display: "block" }}
            >
              {step === "language"
                ? "Choose Language"
                : `Choose ${languages?.[tempLanguage]?.name} Dialect`}
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {items.map(([key, value], i) => {
                const isLanguage = step === "language";
                const lang = value as Language;
                const dialect = value as { name: string; region: string };
                const isSelected = isLanguage ? key === selectedLanguage : key === selectedDialect;

                return (
                  <Box
                    key={key}
                    ref={(el) => {
                      itemsRef.current[i] = el as HTMLDivElement;
                    }}
                    onClick={() =>
                      isLanguage ? handleLanguageSelect(key) : handleDialectSelect(key)
                    }
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      p: 1.5,
                      borderRadius: 3,
                      cursor: "pointer",
                      bgcolor: isSelected
                        ? "primary.main"
                        : theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(0,0,0,0.02)",
                      color: isSelected ? "white" : "text.primary",
                      transition: "background-color 0.2s",
                      "&:hover": {
                        bgcolor: isSelected
                          ? "primary.dark"
                          : theme.palette.mode === "dark"
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.06)",
                      },
                    }}
                  >
                    {isLanguage && (
                      <Typography variant="h5" component="span">
                        {lang.flag}
                      </Typography>
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" fontWeight={600}>
                        {isLanguage ? lang.name : dialect.name}
                      </Typography>
                      {!isLanguage && (
                        <Typography
                          variant="caption"
                          sx={{ color: isSelected ? "rgba(255,255,255,0.7)" : "text.secondary" }}
                        >
                          {dialect.region}
                        </Typography>
                      )}
                    </Box>
                    {isLanguage && (
                      <Chip
                        label={`${Object.keys(lang.dialects).length} dialects`}
                        size="small"
                        sx={{
                          bgcolor: isSelected ? "rgba(255,255,255,0.2)" : "action.hover",
                          color: isSelected ? "white" : "text.secondary",
                        }}
                      />
                    )}
                    {isSelected && <Check sx={{ ml: "auto" }} />}
                  </Box>
                );
              })}
            </Box>

            {step === "dialect" && (
              <Button
                onClick={() => {
                  setStep("language");
                  itemsRef.current = [];
                }}
                size="small"
                sx={{ mt: 2 }}
              >
                ← Back to languages
              </Button>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
}
