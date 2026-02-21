import type { NextConfig } from "next";
import createNextPWA from "@ducanh2912/next-pwa";

/**
 * Configures the Next.js application as a Progressive Web App (PWA).
 * PWA capabilities are disabled during development to avoid caching issues.
 */
const withPWA = createNextPWA({
  dest: "public",
  disable: process.env.NODE_ENV !== "production",
});

/**
 * Core Next.js configuration object.
 */
const nextConfig: NextConfig = {
  // Enables the experimental React compiler for potential performance boosts.
  reactCompiler: true,
};

// Export the Next config wrapped with the Next-PWA plugin.
export default withPWA(nextConfig);
