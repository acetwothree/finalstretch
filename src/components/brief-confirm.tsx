"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, HelpCircle, Plus, Sparkles, X } from "lucide-react";
import { useFlow } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/glow-card";
import { FinishLineBar, FinishLineSpinner } from "@/components/ui/finish-line-loader";
import { cn } from "@/lib/utils";

const GOAL_PRESETS = [
  "Get people to pay for it",
  "Get lots of free signups",
  "Get my first few customers",
  "Just get it live",
  "Make it something I'm proud to show",
  "Keep it small & low-maintenance",
];
const NOT_SURE = "Not sure — you pick what's best";

export function BriefConfirm() {
  const brief = useFlow((s) => s.brief);
  const briefLoading = useFlow((s) => s.briefLoading);
  const stage = useFlow((s) => s.stage);
  const confirmBrief = useFlow((s) => s.confirmBrief);
  const aiReadiness = useFlow((s) => s.analysis?.readiness ?? null);

  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [pct, setPct] = useState(60);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (brief && !touched) {
      setDescription(brief.description);
      setAudience(brief.audience);
      if (aiReadiness != null) setPct(aiReadiness);
      const raw = brief.goal || "";
      const parts = raw.split(/[·;\n]+/).map((s) => s.trim()).filter(Boolean);
      const seeded = new Set<string>();
      for (const part of parts.length ? parts : [raw]) {
        if (/not sure|you (pick|decide|choose)/i.test(part)) {
          seeded.add(NOT_SURE);
          continue;
        }
        const hit = GOAL_PRESETS.find(
          (p) =>
            part.toLowerCase().includes(p.toLowerCase().split(" ")[0]) &&
            p.split(" ").some((w) => part.toLowerCase().includes(w.toLowerCase())),
        );
        if (hit) seeded.add(hit);
        else if (part) seeded.add(part);
      }
      setGoals([...seeded]);
    }
  }, [brief, touched, aiReadiness]);

  const generating = stage === "generating";
  const toggle = (g: string) => {
    setTouched(true);
    setGoals((cur) =>
      cur.includes(g)
        ? cur.filter((x) => x !== g)
        : g === NOT_SURE
          ? [NOT_SURE]
          : [...cur.filter((x) => x !== NOT_SURE), g],
    );
  };
  const addCustom = () => {
    const v = customGoal.trim();
    if (!v) return;
    setTouched(true);
    setGoals((cur) => (cur.includes(v) ? cur : [...cur.filter((x) => x !== NOT_SURE), v]));
    setCustomGoal("");
  };

  const customChips = useMemo(
    () => goals.filter((g) => g !== NOT_SURE && !GOAL_PRESETS.includes(g)),
    [goals],
  );
  const canSubmit = description.trim() && goals.length > 0;

  if (generating) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-obsidian px-5"
      >
        <GlowCard className="w-full max-w-md p-8">
          <FinishLineBar
            etaMs={17000}
            label="Building your launch plan…"
            sub="Turning your answers into a prioritized, ordered checklist."
          />
        </GlowCard>
      </motion.div>
    );
  }

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
              quick check
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Here&apos;s what I think you&apos;re building
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Fix anything that&apos;s wrong — the whole plan is built from this.
          </p>

          {briefLoading || !brief ? (
            <div className="flex flex-col items-center py-12">
              <FinishLineBar etaMs={11000} label="Reading your project…" />
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {brief.unsure && (
                <p className="flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-500/10 p-2.5 text-xs text-amber-200">
                  <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  I couldn&apos;t fully tell what this is from the code — please
                  correct the description below.
                </p>
              )}

              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  What it is
                </span>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setTouched(true);
                    setDescription(e.target.value);
                  }}
                  rows={3}
                  className="mt-1.5 w-full resize-y rounded-xl border border-white/12 bg-white/[0.03] p-3 text-sm leading-relaxed text-slate-100 outline-none focus:border-violet-400/60"
                />
              </label>

              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  What matters most{" "}
                  <span className="text-slate-600">— pick any, or &ldquo;not sure&rdquo;</span>
                </span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {[...GOAL_PRESETS, NOT_SURE].map((g) => {
                    const on = goals.includes(g);
                    return (
                      <button
                        key={g}
                        onClick={() => toggle(g)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors duration-150",
                          on
                            ? "border-violet-400 bg-violet-500/15 text-white"
                            : "border-white/12 bg-white/[0.03] text-slate-300 hover:border-violet-400/40",
                          g === NOT_SURE && !on && "text-slate-400",
                        )}
                      >
                        {on && <Check className="h-3 w-3" />}
                        {g}
                      </button>
                    );
                  })}
                </div>

                {customChips.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {customChips.map((g) => (
                      <span
                        key={g}
                        className="flex items-center gap-1.5 rounded-lg border border-violet-400 bg-violet-500/15 px-3 py-1.5 text-xs text-white"
                      >
                        {g}
                        <button
                          onClick={() => toggle(g)}
                          className="text-violet-200 hover:text-white"
                          aria-label={`Remove ${g}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex gap-2">
                  <input
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
                    placeholder="Something else…"
                    className="h-10 flex-1 rounded-xl border border-white/12 bg-white/[0.03] px-3 text-sm text-slate-100 outline-none focus:border-violet-400/60"
                  />
                  <Button size="sm" variant="outline" onClick={addCustom} type="button">
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Who it&apos;s for
                </span>
                <input
                  value={audience}
                  onChange={(e) => {
                    setTouched(true);
                    setAudience(e.target.value);
                  }}
                  placeholder="Not sure? Leave it — I'll guess."
                  className="mt-1.5 h-11 w-full rounded-xl border border-white/12 bg-white/[0.03] px-3.5 text-sm text-slate-100 outline-none focus:border-violet-400/60"
                />
              </label>

              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    How close to done, really?
                  </span>
                  <span className="font-mono text-sm font-semibold text-violet-200">
                    {pct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={98}
                  value={pct}
                  onChange={(e) => {
                    setTouched(true);
                    setPct(Number(e.target.value));
                  }}
                  className="fl-range mt-1.5"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  My guess from the code is filled in — drag it to what you know is
                  true. It changes how the plan is scoped.
                </p>
              </div>

              {brief.plan && (
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    My plan
                  </span>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">
                    {brief.plan}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-end">
            <Button
              size="lg"
              disabled={briefLoading || generating || !canSubmit}
              onClick={() =>
                void confirmBrief(
                  {
                    description: description.trim(),
                    goal: goals.includes(NOT_SURE)
                      ? "Not sure — you decide"
                      : goals.join(" · "),
                    audience: audience.trim() || "Not sure — you decide",
                  },
                  pct,
                )
              }
            >
              {generating ? (
                <>
                  <FinishLineSpinner />
                  Building your plan…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Looks right — build my plan
                </>
              )}
            </Button>
          </div>
        </GlowCard>
      </motion.div>
    </motion.div>
  );
}
