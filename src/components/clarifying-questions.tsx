"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useFlow } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/glow-card";
import { FinishLineSpinner } from "@/components/ui/finish-line-loader";
import { cn } from "@/lib/utils";

export function ClarifyingQuestions() {
  const analysis = useFlow((s) => s.analysis);
  const answers = useFlow((s) => s.answers);
  const setAnswer = useFlow((s) => s.setAnswer);
  const requestBrief = useFlow((s) => s.requestBrief);
  const stage = useFlow((s) => s.stage);

  const [customOpen, setCustomOpen] = useState<Record<string, boolean>>({});

  if (!analysis) return null;
  const busy = stage === "brief" || stage === "generating";
  const answered = analysis.questions.filter((q) => (answers[q.id] ?? "").trim()).length;
  const allAnswered = answered === analysis.questions.length;

  const chip =
    "rounded-lg border px-3.5 py-2 text-sm transition-colors duration-150";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto overscroll-contain bg-obsidian px-5 py-10 sm:items-center"
    >
      <motion.div
        initial={{ y: 18, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 20 }}
        className="w-full max-w-2xl [transform:translateZ(0)]"
      >
        <GlowCard className="p-6 sm:p-8">
          <div className="flex items-center gap-2 text-violet-300">
            <Sparkles className="h-4 w-4" />
            <span className="font-mono text-xs uppercase tracking-[0.2em]">
              scan complete
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            A few quick questions
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {analysis.summary}
          </p>

          {analysis.source === "mock" && (
            <p className="mt-2 text-xs text-amber-300/80">
              Showing sample questions right now — the live version tailors these
              to your code.
            </p>
          )}

          <div className="mt-7 space-y-6">
            {analysis.questions.map((q, i) => {
              const value = answers[q.id] ?? "";
              const isCustom =
                customOpen[q.id] || (value && !q.options.includes(value));
              return (
                <div key={q.id}>
                  <p className="text-sm font-medium text-slate-200">
                    <span className="mr-2 font-mono text-violet-400">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {q.question}
                  </p>
                  {q.hint && <p className="mt-1 text-xs text-slate-500">{q.hint}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setAnswer(q.id, opt);
                          setCustomOpen((s) => ({ ...s, [q.id]: false }));
                        }}
                        className={cn(
                          chip,
                          value === opt && !isCustom
                            ? "border-violet-400 bg-violet-500/15 text-white"
                            : "border-white/12 bg-white/[0.03] text-slate-300 hover:border-violet-400/40 hover:text-white",
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                    {q.allowCustom && (
                      <button
                        onClick={() => {
                          setCustomOpen((s) => ({ ...s, [q.id]: true }));
                          setAnswer(q.id, "");
                        }}
                        className={cn(
                          chip,
                          isCustom
                            ? "border-violet-400 bg-violet-500/15 text-white"
                            : "border-white/12 bg-white/[0.03] text-slate-300 hover:border-violet-400/40",
                        )}
                      >
                        Something else…
                      </button>
                    )}
                  </div>
                  {q.allowCustom && isCustom && (
                    <input
                      autoFocus
                      value={q.options.includes(value) ? "" : value}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      placeholder="Type your answer"
                      className="mt-2 h-11 w-full rounded-lg border border-white/12 bg-white/[0.03] px-3.5 text-sm text-slate-100 outline-none focus:border-violet-400/60"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <span className="text-xs text-slate-500">
              {answered}/{analysis.questions.length} answered
            </span>
            <Button
              size="lg"
              disabled={!allAnswered || busy}
              onClick={() => void requestBrief()}
            >
              {busy ? (
                <>
                  <FinishLineSpinner />
                  Reviewing…
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </GlowCard>
      </motion.div>
    </motion.div>
  );
}
