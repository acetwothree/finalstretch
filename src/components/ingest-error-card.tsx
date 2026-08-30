"use client";

import { motion } from "framer-motion";
import { FileArchive, TriangleAlert, X } from "lucide-react";
import type { IngestErrorInfo } from "@/lib/store";

export function IngestErrorCard({
  error,
  onBrowse,
  onDismiss,
}: {
  error: IngestErrorInfo;
  onBrowse: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/[0.06] p-4 text-left"
    >
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-100">{error.title}</p>
          <ol className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-300">
            {error.steps.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 text-amber-300/70">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          {error.fix === "zip" && (
            <button
              onClick={onBrowse}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-violet-400/40 hover:text-white"
            >
              <FileArchive className="h-3.5 w-3.5" />
              Upload a ZIP instead
            </button>
          )}
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
