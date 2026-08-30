"use client";

import { motion } from "framer-motion";
import { ListChecks, Rocket, ScanLine } from "lucide-react";
import { GlowCard } from "@/components/ui/glow-card";

const STEPS = [
  {
    n: "01",
    icon: ScanLine,
    title: "Diagnose",
    body: "Drop a ZIP or connect a repo. FinalStretch reads the file tree, dependencies, and config to find what's actually blocking launch.",
  },
  {
    n: "02",
    icon: ListChecks,
    title: "Prioritize",
    body: "Answer 2–3 sharp questions and get a ranked checklist: critical code fixes, deployment & compliance, marketing & assets.",
  },
  {
    n: "03",
    icon: Rocket,
    title: "Ship",
    body: "Open any task and the AI co-pilot hands you the exact diff or step-by-step. Check it off, watch the bar climb, launch.",
  },
];

export function HowItWorks() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {STEPS.map((s, i) => (
        <motion.div
          key={s.n}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ delay: i * 0.08 }}
          whileHover={{ y: -4 }}
        >
          <GlowCard className="h-full p-6 transition-colors hover:border-violet-400/40">
            <span className="pointer-events-none absolute right-4 top-3 text-5xl font-bold tracking-tight text-white/[0.04]">
              {s.n}
            </span>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/10">
              <s.icon className="h-5 w-5 text-violet-200" />
            </div>
            <h3 className="mb-1.5 text-base font-semibold tracking-tight text-white">
              {s.title}
            </h3>
            <p className="text-sm leading-relaxed text-slate-400">{s.body}</p>
          </GlowCard>
        </motion.div>
      ))}
    </div>
  );
}
