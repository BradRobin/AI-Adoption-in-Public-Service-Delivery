// Basic Next.js font and metadata imports
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AccessibilityProvider } from "@/components/AccessibilityProvider";
import { PrivacyConsentProvider } from "@/components/PrivacyBanner";
import { TopScrollBlur } from "@/components/TopScrollBlur";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ThemeProvider } from "@/lib/theme-context";
import { ClientOverlays } from "@/components/ClientOverlays";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        className={`${geistSans.variable} ${geistMono.variable} text-tier-system antialiased`}
      >
        {/* Flash-of-wrong-theme prevention: runs before React hydration */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('parp-theme');if(t!=='dark')document.documentElement.classList.add('light-mode');}catch(e){document.documentElement.classList.add('light-mode');}`,
          }}
        />
        <ThemeProvider>
        <AccessibilityProvider>
          <PrivacyConsentProvider>
            <TopScrollBlur />

            {/* Skip to Content Link for Keyboard Users */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:z-100 focus:bg-green-500 focus:p-4 focus:text-black focus:outline-none focus:ring-4 focus:ring-white"
            >
              Skip to main content
            </a>

            {children}
            <MobileBottomNav />

            <ClientOverlays />
          </PrivacyConsentProvider>
        </AccessibilityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
