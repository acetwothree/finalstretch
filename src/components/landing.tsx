"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { ProjectTicker } from "@/components/project-ticker";
import { YourProjects } from "@/components/your-projects";
import { Logo } from "@/components/ui/logo";
import { useFlow } from "@/lib/store";

export function Landing() {
  const hasProjects = useFlow((s) => s.projects.length > 0);
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative min-h-dvh pb-24"
    >
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-5 text-sm text-slate-400">
          {hasProjects && (
            <a href="#projects" className="transition-colors hover:text-white">
              Your projects
            </a>
          )}
          <a href="#how" className="transition-colors hover:text-white">
            How it works
          </a>
          <Link href="/pricing" className="transition-colors hover:text-white">
            Pricing
          </Link>
        </nav>
      </header>

      <Hero />

      <YourProjects />

      <section id="how" className="mx-auto mt-24 max-w-5xl px-5 scroll-mt-24">
        <h2 className="mb-6 text-center text-sm font-medium uppercase tracking-[0.25em] text-slate-500">
          Three moves to the finish line
        </h2>
        <HowItWorks />
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-5">
        <ProjectTicker />
      </section>

      <footer className="mx-auto mt-24 max-w-6xl px-5 text-center text-xs text-slate-600">
        FinalStretch · finalstretch.dev — built for people who are almost done.
      </footer>
    </motion.main>
  );
}
