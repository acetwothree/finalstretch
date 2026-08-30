import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle. Vercel ignores this; Hostinger / a VPS / any
  // Node host can run `.next/standalone/server.js` directly.
  output: "standalone",
  turbopack: {
    // The dev machine has a stray package-lock.json in the home dir; pin the
    // workspace root to this project so Next resolves deps from here.
    root: import.meta.dirname,
  },
};

export default nextConfig;
