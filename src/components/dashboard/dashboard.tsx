"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Megaphone,
  PartyPopper,
  Rocket,
  Share2,
  TrendingUp,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { computeReadiness, FREE_TASKS, useFlow } from "@/lib/store";
import { TASK_CATEGORIES } from "@/lib/types";
import type { TaskCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/glow-card";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/ui/logo";
import { TaskRow } from "./task-row";
import { ReadinessPanel } from "./readiness-panel";
import { CopilotDrawer } from "./copilot-drawer";
import { ShareBar } from "./share-bar";
import { PaywallCard } from "@/components/paywall/paywall-card";

const CATEGORY_META: Record<TaskCategory, { icon: LucideIcon; accent: string }> = {
  "Critical Code Fixes": { icon: Wrench, accent: "text-rose-300" },
  "Deployment & Compliance": { icon: Rocket, accent: "text-violet-300" },
  "Product & Growth": { icon: TrendingUp, accent: "text-cyan-300" },
  "Marketing & Assets": { icon: Megaphone, accent: "text-emerald-300" },
};

export function Dashboard() {
  const checklist = useFlow((s) => s.checklist);
  const meta = useFlow((s) => s.meta);
  const plan = useFlow((s) => s.plan);
  const sharedView = useFlow((s) => s.sharedView);
  const reset = useFlow((s) => s.reset);
  const [launched, setLaunched] = useState(false);

  const readiness = useMemo(
    () =>
      checklist
        ? computeReadiness(checklist.tasks, checklist.launchReadiness)
        : 0,
    [checklist],
  );

  if (!checklist || !meta) return null;

  const gated = plan === "free" && !sharedView;
  const lockedCount = gated ? Math.max(0, checklist.tasks.length - FREE_TASKS) : 0;
  const doneCount = checklist.tasks.filter((t) => t.done).length;
  const criticalLeft = checklist.tasks.filter(
    (t) => !t.done && t.severity === "critical",
  ).length;
  const ready = readiness >= 100;

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mx-auto min-h-dvh max-w-6xl px-5 py-8"
    >
      <div className="flex items-center justify-between">
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {sharedView ? "Scan your own project" : "Scan another project"}
        </button>
        <Logo />
      </div>

      {sharedView && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-2.5 text-xs text-violet-100">
          <Share2 className="h-3.5 w-3.5" />
          You&apos;re viewing a shared launch plan. Progress you tick here stays in
          your browser.
        </div>
      )}

      {/* headline strip */}
      <GlowCard className="mt-6 overflow-hidden p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-white">
              {meta.name}
            </h1>
            <p className="mt-1 text-sm text-slate-400">{checklist.projectSummary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[meta.detectedType, ...meta.detectedStack].slice(0, 6).map((chip) => (
                <span
                  key={chip}
                  className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-300"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <Button
            size="lg"
            disabled={!ready}
            onClick={() => setLaunched(true)}
            className={ready ? "animate-pulse" : ""}
          >
            <Rocket className="h-4 w-4" />
            {ready ? "Launch it" : `${readiness}% — keep going`}
          </Button>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-4xl font-semibold tracking-tight text-white">
              {readiness}
              <span className="text-xl text-slate-500">% to Launch</span>
            </span>
            <span className="text-sm text-slate-400">
              {doneCount}/{checklist.tasks.length} cleared
              {criticalLeft > 0 && (
                <span className="text-rose-300"> · {criticalLeft} critical left</span>
              )}
            </span>
          </div>
          <Progress value={readiness} />
        </div>

        <div className="mt-5 border-t border-white/8 pt-4">
          <ShareBar readiness={readiness} />
        </div>
      </GlowCard>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {TASK_CATEGORIES.map((cat) => {
            const tasks = checklist.tasks.filter((t) => t.category === cat);
            if (!tasks.length) return null;
            const cm = CATEGORY_META[cat];
            const done = tasks.filter((t) => t.done).length;
            return (
              <section key={cat}>
                <div className="mb-3 flex items-center gap-2">
                  <cm.icon className={`h-4 w-4 ${cm.accent}`} />
                  <h2 className="text-sm font-semibold tracking-tight text-white">
                    {cat}
                  </h2>
                  <span className="font-mono text-xs text-slate-500">
                    {done}/{tasks.length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {tasks.map((t) => {
                    const globalIdx = checklist.tasks.findIndex(
                      (x) => x.id === t.id,
                    );
                    const locked = gated && globalIdx >= FREE_TASKS;
                    return (
                      <div key={t.id}>
                        <TaskRow task={t} locked={locked} />
                        {gated && globalIdx === FREE_TASKS - 1 && lockedCount > 0 && (
                          <div className="pt-2.5">
                            <PaywallCard lockedCount={lockedCount} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="hidden lg:block">
          <ReadinessPanel readiness={readiness} tasks={checklist.tasks} />
        </div>
      </div>

      <CopilotDrawer />

      <AnimatePresence>
        {launched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLaunched(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/90 px-5 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              className="relative text-center"
            >
              {Array.from({ length: 18 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
                  style={{
                    background: ["#a78bfa", "#34d399", "#818cf8", "#f0abfc"][i % 4],
                  }}
                  initial={{ opacity: 1, x: 0, y: 0 }}
                  animate={{
                    opacity: 0,
                    x: (Math.random() - 0.5) * 340,
                    y: (Math.random() - 0.5) * 340,
                  }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                />
              ))}
              <PartyPopper className="mx-auto h-12 w-12 text-emerald-400" />
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                That&apos;s a launch.
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {meta.name} cleared every step. Go tell someone.
              </p>
              <Button
                className="mt-5"
                variant="outline"
                onClick={() => setLaunched(false)}
              >
                Back to the board
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
