"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, FileText, Link2, Lock } from "lucide-react";
import { allows, useFlow } from "@/lib/store";
import { buildMarkdown, sharePlanUrl } from "@/lib/report";
import { cn } from "@/lib/utils";

type Copied = null | "md" | "link";

export function ShareBar({ readiness }: { readiness: number }) {
  const meta = useFlow((s) => s.meta);
  const checklist = useFlow((s) => s.checklist);
  const unlocked = useFlow((s) => allows(s.plan, s.sharedView, "export"));
  const openUnlock = useFlow((s) => s.openUnlock);
  const [copied, setCopied] = useState<Copied>(null);

  if (!meta || !checklist) return null;

  async function copy(kind: "md" | "link") {
    if (!unlocked) return openUnlock("export");
    const text =
      kind === "md"
        ? buildMarkdown(meta!, checklist!, readiness)
        : sharePlanUrl(meta!, checklist!, useFlow.getState().builtPercent);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked — noop */
    }
  }

  const btn =
    "inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.03] px-3 text-xs font-medium text-slate-300 transition-colors hover:border-violet-400/40 hover:text-white";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => copy("md")} className={cn(btn)}>
        {copied === "md" ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : unlocked ? (
          <FileText className="h-3.5 w-3.5" />
        ) : (
          <Lock className="h-3.5 w-3.5" />
        )}
        {copied === "md" ? "Copied" : "Export Markdown"}
      </button>

      <button onClick={() => copy("link")} className={cn(btn)}>
        {copied === "link" ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : unlocked ? (
          <Link2 className="h-3.5 w-3.5" />
        ) : (
          <Lock className="h-3.5 w-3.5" />
        )}
        {copied === "link" ? "Link copied" : "Share My Launch Plan"}
      </button>

      <AnimatePresence>
        {copied && (
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-slate-500"
          >
            {copied === "md" ? "Markdown on your clipboard" : "Anyone with the link sees this plan"}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
