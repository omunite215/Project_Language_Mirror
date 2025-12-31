import type { Metadata } from "next";
import { ThemeProvider } from "@/theme/ThemeContext";
import { QueryProvider } from "@/lib/QueryProvider";
import "./page.module.css";

export const metadata: Metadata = {
  title: "Language Mirror - Immersive Language Tutor",
  description:
    "Learn languages by conversing with native-speaking AI tutors in authentic regional dialects.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
