// Basic Next.js font and metadata imports
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToasterClient } from "@/components/ToasterClient";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PARP-AI Readiness Platform",
  description:
    "Assess your AI readiness and chat with PARP about Technology–Organization–Environment (TOE) factors in the Kenyan context.",
  manifest: "/manifest.json",
  themeColor: "#000000",
};

/**
 * RootLayout is the top-most layout component that wraps all pages.
 * It sets the html lang, loads fonts, and includes the ToasterClient for notifications.
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
        {children}
        <ToasterClient />
      </body>
    </html>
  );
}
