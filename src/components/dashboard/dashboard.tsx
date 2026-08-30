"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Megaphone,
  MessageSquarePlus,
  Play,
  PartyPopper,
  Rocket,
  Share2,
  TrendingUp,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { computeReadiness, FREE_TASKS, useFlow } from "@/lib/store";
import { canRunInBrowser, parseOwnerRepo } from "@/lib/preview";
import { TASK_CATEGORIES } from "@/lib/types";
import type { Platform, TaskCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/glow-card";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { FinishLineBar } from "@/components/ui/finish-line-loader";
import { TaskRow } from "./task-row";
import { GuidedPath } from "./guided-path";
import { ReadinessPanel } from "./readiness-panel";
import { CopilotDrawer } from "./copilot-drawer";
import { PreviewPanel } from "./preview-panel";
import { CorrectionField } from "./correction-field";
import { ShareBar } from "./share-bar";
import { PaywallCard } from "@/components/paywall/paywall-card";

const PLATFORM_LABEL: Record<Platform, string> = {
  ios: "iPhone app",
  android: "Android app",
  web: "Web",
  desktop: "Desktop app",
  game: "Game",
  python: "Python service",
  cli: "Command-line tool",
};

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
  const guidedMode = useFlow((s) => s.guidedMode);
  const setGuidedMode = useFlow((s) => s.setGuidedMode);
  const revising = useFlow((s) => s.revising);
  const corrections = useFlow((s) => s.corrections);
  const reset = useFlow((s) => s.reset);
  const openPreview = useFlow((s) => s.openPreview);
  const [launched, setLaunched] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);

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
  const canRun = canRunInBrowser(meta);
  const repo = parseOwnerRepo(meta.githubUrl);

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => openPreview(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 transition-colors hover:border-cyan-400/50"
          >
            <Play className="h-3.5 w-3.5" />
            Preview
          </button>
          <Logo />
        </div>
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

            {!sharedView && (
              <div className="mt-3">
                <button
                  onClick={() => setShowCorrect((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-white"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  {corrections.length
                    ? `Got something else wrong? (${corrections.length} fixed)`
                    : "Something off? Tell the AI what it got wrong"}
                </button>
                {showCorrect && (
                  <div className="mt-2 max-w-xl rounded-xl border border-violet-400/25 bg-violet-500/[0.06] p-3">
                    <p className="mb-2 text-[11px] leading-relaxed text-slate-400">
                      Tell it what&apos;s actually true — wrong stack, different
                      host, a feature that doesn&apos;t exist. It rebuilds the
                      whole plan around it.
                    </p>
                    <CorrectionField onSubmitted={() => setShowCorrect(false)} />
                  </div>
                )}
              </div>
            )}
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

      {/* preview entry point */}
      <div className="mt-4">
        {canRun ? (
          <button
            onClick={() => openPreview(null)}
            className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-cyan-400/25 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(14,165,233,0.05))] px-5 py-4 text-left transition-colors hover:border-cyan-400/50"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10">
                <Play className="h-4 w-4 text-cyan-200" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">
                  Test your project in the browser
                </span>
                <span className="block text-xs text-slate-400">
                  Boots a live preview right here — no setup.
                </span>
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-cyan-300 transition-transform group-hover:translate-x-0.5" />
          </button>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
            <p className="text-sm text-slate-300">
              <span className="font-medium text-white">
                {PLATFORM_LABEL[meta.platform]}
              </span>{" "}
              projects can&apos;t fully run in a browser preview.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {repo
                ? "Open the code in a browser editor — it still boots whatever front-end parts it can."
                : "Download the finished project and run it in your usual tools."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {repo && (
                <a
                  href={`https://stackblitz.com/github/${repo.owner}/${repo.repo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-xs text-slate-200 transition-colors hover:border-cyan-400/40"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open the code in a browser editor
                </a>
              )}
              <button
                onClick={() => openPreview(null)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 transition-colors hover:border-cyan-400/40"
              >
                <Play className="h-3.5 w-3.5" />
                Try a partial preview anyway
              </button>
            </div>
          </div>
        )}
      </div>

      {/* guided / full-list switch */}
      <div className="mt-6 flex w-fit items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
        {(
          [
            ["guided", "Guided"],
            ["full", "Full list"],
          ] as const
        ).map(([k, label]) => {
          const on = (k === "guided") === guidedMode;
          return (
            <button
              key={k}
              onClick={() => setGuidedMode(k === "guided")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                on ? "bg-white/10 text-white" : "text-slate-400 hover:text-white",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        {guidedMode
          ? "One step at a time, in the order I'd tackle them. Skip or go back anytime."
          : "Every step at once — check off whatever you want."}
      </p>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {guidedMode
            ? <GuidedPath />
            : TASK_CATEGORIES.map((cat) => {
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
                            {gated &&
                              globalIdx === FREE_TASKS - 1 &&
                              lockedCount > 0 && (
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
      <PreviewPanel />

      <AnimatePresence>
        {revising && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-obsidian/90 px-5"
          >
            <GlowCard className="w-full max-w-md p-8">
              <FinishLineBar
                label="Rebuilding your plan with your note…"
                sub="Every step gets re-checked against what you just told it."
              />
            </GlowCard>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {launched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLaunched(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/90 px-5"
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
