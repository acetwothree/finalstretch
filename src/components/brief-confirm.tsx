"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Plus, Sparkles, X } from "lucide-react";
import { useFlow } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/glow-card";
import { cn } from "@/lib/utils";

const GOAL_PRESETS = [
  "Sell as many copies / licenses as possible",
  "Maximise free signups",
  "Keep people coming back (retention)",
  "Land my first paying customers",
  "Grow through word of mouth / sharing",
  "Ship something I'm proud to show off",
  "Just get it live in front of real users",
  "Keep it small and low-maintenance",
];

export function BriefConfirm() {
  const brief = useFlow((s) => s.brief);
  const briefLoading = useFlow((s) => s.briefLoading);
  const stage = useFlow((s) => s.stage);
  const confirmBrief = useFlow((s) => s.confirmBrief);

  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (brief && !touched) {
      setDescription(brief.description);
      setAudience(brief.audience);
      // seed goals: match presets by loose keyword, else keep the AI line as one chip
      const raw = brief.goal || "";
      const parts = raw.split(/[·;\n]+/).map((s) => s.trim()).filter(Boolean);
      const seeded = new Set<string>();
      for (const part of parts.length ? parts : [raw]) {
        const hit = GOAL_PRESETS.find((p) =>
          part.toLowerCase().includes(p.toLowerCase().split(" ")[0]) &&
          p.split(" ").some((w) => part.toLowerCase().includes(w.toLowerCase())),
        );
        if (hit) seeded.add(hit);
        else if (part) seeded.add(part);
      }
      setGoals([...seeded]);
    }
  }, [brief, touched]);

  const generating = stage === "generating";
  const toggle = (g: string) => {
    setTouched(true);
    setGoals((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  };
  const addCustom = () => {
    const v = customGoal.trim();
    if (!v) return;
    setTouched(true);
    setGoals((cur) => (cur.includes(v) ? cur : [...cur, v]));
    setCustomGoal("");
  };

  const customChips = useMemo(
    () => goals.filter((g) => !GOAL_PRESETS.includes(g)),
    [goals],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-obsidian/92 px-5 py-10 backdrop-blur-sm sm:items-center"
    >
      <motion.div
        initial={{ y: 18, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 20 }}
        className="w-full max-w-2xl"
      >
        <GlowCard className="p-6 sm:p-8">
          <div className="flex items-center gap-2 text-violet-300">
            <Sparkles className="h-4 w-4" />
            <span className="font-mono text-xs uppercase tracking-[0.2em]">
              on the same page
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Here&apos;s what I think you&apos;re building
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Fix anything that&apos;s off. The plan is built entirely around this.
          </p>

          {briefLoading || !brief ? (
            <div className="mt-6 space-y-3">
              {[92, 80, 88, 60].map((w, i) => (
                <div key={i} className="shimmer h-4 rounded" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : (
            <div className="mt-6 space-y-5">
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
                  rows={4}
                  className="mt-1.5 w-full resize-y rounded-xl border border-white/12 bg-white/[0.03] p-3 text-sm leading-relaxed text-slate-100 outline-none focus:border-violet-400/60"
                />
              </label>

              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  What you&apos;re trying to do{" "}
                  <span className="text-slate-600">— pick any that apply</span>
                </span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {GOAL_PRESETS.map((g) => {
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
                    placeholder="Add your own…"
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
                  className="mt-1.5 h-11 w-full rounded-xl border border-white/12 bg-white/[0.03] px-3.5 text-sm text-slate-100 outline-none focus:border-violet-400/60"
                />
              </label>
            </div>
          )}

          <div className="mt-8 flex items-center justify-end">
            <Button
              size="lg"
              disabled={briefLoading || generating || !description.trim() || !goals.length}
              onClick={() =>
                void confirmBrief({
                  description: description.trim(),
                  goal: goals.join(" · ") || GOAL_PRESETS[6],
                  audience: audience.trim() || "Its intended users.",
                })
              }
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Building your plan…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  This is right — build my plan
                </>
              )}
            </Button>
          </div>
        </GlowCard>
      </motion.div>
    </motion.div>
  );
}
