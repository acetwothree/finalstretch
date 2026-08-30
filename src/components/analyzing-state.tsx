"use client";

import { motion } from "framer-motion";
import { useFlow } from "@/lib/store";
import { GlowCard } from "@/components/ui/glow-card";
import { FinishLineBar } from "@/components/ui/finish-line-loader";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="truncate text-right text-slate-200">{value}</span>
    </div>
  );
}

/** Honest loading state while /api/analyze runs — real facts, no scripted theatre. */
export function AnalyzingState() {
  const meta = useFlow((s) => s.meta);
  if (!meta) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-obsidian/90 px-5"
    >
      <motion.div
        initial={{ y: 16, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 20 }}
        className="w-full max-w-md"
      >
        <GlowCard className="p-6 sm:p-7">
          <FinishLineBar
            label={`Analyzing ${meta.name}…`}
            sub={`Reading your ${
              meta.source === "zip" ? "project files" : "repository"
            } and writing questions for your plan.`}
          />

          <div className="mt-6 space-y-2">
            <Fact label="Type" value={meta.detectedType} />
            <Fact label="Files scanned" value={meta.fileCount ? String(meta.fileCount) : "—"} />
            <Fact label="Stack" value={meta.detectedStack.join(", ") || "—"} />
          </div>

          {meta.notes.length > 0 && (
            <ul className="mt-4 space-y-1 border-t border-white/8 pt-3 text-xs text-slate-400">
              {meta.notes.slice(0, 3).map((n, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-violet-400/70">·</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          )}
        </GlowCard>
      </motion.div>
    </motion.div>
  );
}
