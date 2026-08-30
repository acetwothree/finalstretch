import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Background } from "@/components/background";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://finalstretch.dev"),
  title: "FinalStretch — ship the last 20%",
  description:
    "An AI emergency room for half-finished projects. Drop a ZIP or a GitHub repo, get a diagnosis and a prioritized checklist, and ship it.",
  openGraph: {
    title: "FinalStretch — ship the last 20%",
    description:
      "Drop your messy codebase. Get an AI diagnosis. Clear the checklist. Launch.",
    url: "https://finalstretch.dev",
    siteName: "FinalStretch",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "FinalStretch — ship the last 20%" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full`}>
      <body className="min-h-full antialiased">
        <Background />
        {children}
      </body>
    </html>
  );
}
