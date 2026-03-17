// Basic Next.js font and metadata imports
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AdminToeQuizPopup } from "@/components/admin/AdminToeQuizPopup";
import { AccessibilityProvider } from "@/components/AccessibilityProvider";
import { TopScrollBlur } from "@/components/TopScrollBlur";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Global metadata configuration for the Next.js application.
 * Defines the main title, description, and PWA manifest properties.
 */
export const metadata: Metadata = {
  title: "PARP-AI Readiness Platform",
  description:
    "Assess your AI readiness and chat with PARP about Technology–Organization–Environment (TOE) factors in the Kenyan context.",
  manifest: "/manifest.json",
  themeColor: "#000000",
};

/**
 * RootLayout is the top-most layout component that wraps all pages.
 * It sets the html lang, loads fonts, and includes global accessibility overlays.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AccessibilityProvider>
          <TopScrollBlur />

          {/* Skip to Content Link for Keyboard Users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-green-500 focus:p-4 focus:text-black focus:outline-none focus:ring-4 focus:ring-white"
          >
            Skip to main content
          </a>

          {children}

          <AdminToeQuizPopup />
          <footer className="w-full text-center text-xs text-white/30 py-6 pointer-events-none relative z-50">
            Built by Engineer Brad Robinson
          </footer>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
