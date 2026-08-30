"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  ListChecks,
  PartyPopper,
  SkipForward,
  Sparkles,
  X,
} from "lucide-react";
import { FREE_TASKS, guidedOrder, useFlow } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/glow-card";
import { PaywallCard } from "@/components/paywall/paywall-card";
import { cn, formatDuration } from "@/lib/utils";
import type { Severity } from "@/lib/types";

const SEV: Record<Severity, { label: string; cls: string }> = {
  critical: { label: "must fix", cls: "border-rose-400/30 bg-rose-500/10 text-rose-300" },
  high: { label: "important", cls: "border-amber-400/30 bg-amber-500/10 text-amber-300" },
  medium: { label: "should do", cls: "border-sky-400/30 bg-sky-500/10 text-sky-300" },
  low: { label: "nice to have", cls: "border-slate-400/20 bg-slate-500/10 text-slate-300" },
};

export function GuidedPath() {
  const checklist = useFlow((s) => s.checklist);
  const plan = useFlow((s) => s.plan);
  const sharedView = useFlow((s) => s.sharedView);
  const skippedIds = useFlow((s) => s.skippedIds);
  const toggleTask = useFlow((s) => s.toggleTask);
  const dismissTask = useFlow((s) => s.dismissTask);
  const toggleSkip = useFlow((s) => s.toggleSkip);
  const clearSkips = useFlow((s) => s.clearSkips);
  const openCopilot = useFlow((s) => s.openCopilot);
  const openUnlock = useFlow((s) => s.openUnlock);
  const setGuidedMode = useFlow((s) => s.setGuidedMode);

  const seq = useMemo(
    () => (checklist ? guidedOrder(checklist.tasks) : []),
    [checklist],
  );
  const skipSet = useMemo(() => new Set(skippedIds), [skippedIds]);

  const [cursor, setCursor] = useState(0);
  const didInit = useRef(false);

  // land on the first unresolved step once, when the path first loads
  useEffect(() => {
    if (didInit.current || !seq.length) return;
    didInit.current = true;
    const idx = seq.findIndex((t) => !t.done && !skipSet.has(t.id));
    if (idx > 0) setCursor(idx);
  }, [seq, skipSet]);

  // keep the cursor in range if steps get removed
  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, seq.length - 1)));
  }, [seq.length]);

  const jumpToNext = (fromId: string) => {
    const st = useFlow.getState();
    if (!st.checklist) return;
    const order = guidedOrder(st.checklist.tasks);
    const skip = new Set(st.skippedIds);
    const from = order.findIndex((t) => t.id === fromId);
    let n = order.findIndex(
      (t, i) => i > from && !t.done && !skip.has(t.id),
    );
    if (n === -1) n = order.findIndex((t) => !t.done && !skip.has(t.id));
    setCursor(
      n === -1 ? Math.max(0, Math.min(from, order.length - 1)) : n,
    );
  };

  if (!checklist || !seq.length) return null;

  const doneCount = seq.filter((t) => t.done).length;
  const skipCount = seq.filter((t) => skipSet.has(t.id)).length;
  const resolved = seq.filter((t) => t.done || skipSet.has(t.id)).length;
  const allResolved = resolved === seq.length;

  const fullListLink = (
    <button
      onClick={() => setGuidedMode(false)}
      className="mx-auto mt-4 flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
    >
      <ListChecks className="h-3.5 w-3.5" />
      See the full list instead
    </button>
  );

  /* ---------- everything handled ---------- */
  if (allResolved) {
    return (
      <div>
        <GlowCard className="p-8 text-center">
          <PartyPopper className="mx-auto h-10 w-10 text-emerald-400" />
          <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">
            {skipCount
              ? "That's the guided path — for now"
              : "You've walked every step"}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {doneCount} of {seq.length} marked done
            {skipCount ? `, ${skipCount} skipped for later` : ""}.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {skipCount > 0 && (
              <Button
                onClick={() => {
                  clearSkips();
                  setCursor(0);
                  didInit.current = false;
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Revisit the {skipCount} skipped
              </Button>
            )}
            <Button variant="outline" onClick={() => setGuidedMode(false)}>
              <ListChecks className="h-4 w-4" />
              See the full list
            </Button>
          </div>
        </GlowCard>
      </div>
    );
  }

  const current = seq[Math.min(cursor, seq.length - 1)];
  const pos = seq.findIndex((t) => t.id === current.id);
  const sev = SEV[current.severity];
  const gated = plan === "free" && !sharedView;
  const locked = gated && pos >= FREE_TASKS;
  const isSkipped = skipSet.has(current.id);

  const onMarkDone = () => {
    const wasDone = current.done;
    toggleTask(current.id);
    if (!wasDone) jumpToNext(current.id);
  };
  const onSkip = () => {
    const wasSkipped = skipSet.has(current.id);
    toggleSkip(current.id);
    if (!wasSkipped) jumpToNext(current.id);
  };

  return (
    <div>
      <GlowCard className="overflow-hidden p-6 sm:p-7">
        {/* progress header */}
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono uppercase tracking-[0.18em] text-violet-300">
            Step {pos + 1} of {seq.length}
          </span>
          <span className="text-slate-500">
            {doneCount} done
            {skipCount ? ` · ${skipCount} skipped` : ""}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width] duration-300"
            style={{ width: `${(resolved / seq.length) * 100}%` }}
          />
        </div>

        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="mt-5"
        >
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-slate-300">
              {current.category}
            </span>
            <span
              className={cn(
                "rounded-md border px-1.5 py-0.5 font-medium",
                sev.cls,
              )}
            >
              {sev.label}
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="h-3 w-3" />
              {formatDuration(current.estMinutes)}
            </span>
            {current.done && (
              <span className="flex items-center gap-1 text-emerald-300">
                <Check className="h-3 w-3" /> done
              </span>
            )}
            {isSkipped && !current.done && (
              <span className="flex items-center gap-1 text-slate-400">
                <SkipForward className="h-3 w-3" /> skipped
              </span>
            )}
          </div>

          <h3 className="mt-3 text-xl font-semibold leading-snug tracking-tight text-white">
            {current.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {current.description}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            Why it&apos;s here: this is the next thing standing between you and a
            launch you&apos;d be happy with.
          </p>

          {locked ? (
            <div className="mt-5">
              <PaywallCard lockedCount={seq.length - FREE_TASKS} />
            </div>
          ) : (
            <div className="mt-5">
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-cyan-500 to-sky-500 shadow-[0_0_24px_-6px_rgb(34_211_238/0.85)] hover:from-cyan-400 hover:to-sky-400"
                onClick={() => void openCopilot(current.id)}
              >
                <Sparkles className="h-4 w-4" />
                {current.done
                  ? "Open it again"
                  : plan === "pro"
                    ? "Do it for me"
                    : "Do it for me · $19/mo"}
              </Button>
              <p className="mt-1.5 text-center text-[11px] text-slate-600">
                Opens the panel — you&apos;ll see exactly what it&apos;ll change
                before anything runs.
              </p>
            </div>
          )}
        </motion.div>

        {/* nav row */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/8 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor((c) => Math.max(0, c - 1))}
            disabled={pos === 0}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          <Button variant="outline" size="sm" onClick={onMarkDone}>
            <Check className="h-3.5 w-3.5" />
            {current.done ? "Not done yet" : "Mark done"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onSkip}>
            <SkipForward className="h-3.5 w-3.5" />
            {isSkipped ? "Un-skip" : "Skip for now"}
          </Button>
          {!sharedView && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismissTask(current.id)}
              className="text-slate-500 hover:text-rose-300"
            >
              <X className="h-3.5 w-3.5" />
              Not for me
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() =>
              setCursor((c) => Math.min(seq.length - 1, c + 1))
            }
            disabled={pos === seq.length - 1}
          >
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </GlowCard>

      {fullListLink}
    </div>
  );
}
