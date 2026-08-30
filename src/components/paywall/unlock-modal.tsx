"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CreditCard, Loader2, Lock, X } from "lucide-react";
import { EXECUTE_LIMIT, PRO_PRICE, useFlow } from "@/lib/store";

type Phase = "idle" | "redirecting" | "processing" | "done";

const HEADLINE: Record<string, string> = {
  scan: "That was your free scan",
  tasks: "See the whole plan",
  export: "Save & share need the full plan",
  execute: "The “do it for me” button needs the full plan",
};

const PERKS = [
  "Scan as many projects as you want",
  "The whole checklist, not just the first few steps",
  `A “do it for me” button on any step (up to ${EXECUTE_LIMIT} a month)`,
  "It writes the code — you download it or it opens a GitHub PR",
  "Tweak any change first · undo it after",
];

export function UnlockModal() {
  const open = useFlow((s) => s.unlockOpen);
  const reason = useFlow((s) => s.unlockReason);
  const close = useFlow((s) => s.closeUnlock);
  const complete = useFlow((s) => s.completePurchase);
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (open) setPhase("idle");
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase === "idle") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, phase]);

  function pay() {
    setPhase("redirecting");
    window.setTimeout(() => setPhase("processing"), 800);
    window.setTimeout(() => setPhase("done"), 1700);
    window.setTimeout(() => complete(), 2400);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => phase === "idle" && close()}
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-obsidian/92 px-5 py-10"
        >
          <motion.div
            initial={{ y: 20, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 10, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-violet-400/25 bg-obsidian-soft p-6 shadow-[0_0_60px_-12px_rgb(139_92_246/0.5)] sm:p-7"
          >
            <div
              className="pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-60"
              style={{
                background:
                  "radial-gradient(60% 100% at 50% 0%, rgba(139,92,246,0.32), transparent 70%)",
              }}
            />
            {phase !== "done" && (
              <button
                onClick={close}
                disabled={phase !== "idle"}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/10">
                <Lock className="h-4 w-4 text-violet-200" />
              </div>
              <h2 className="mt-3 text-lg font-semibold tracking-tight text-white">
                {HEADLINE[reason] ?? HEADLINE.tasks}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                One plan. Everything, and it makes the changes for you.
              </p>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-tight text-white">
                  ${PRO_PRICE}
                </span>
                <span className="text-sm text-slate-500">a month · cancel anytime</span>
              </div>

              <ul className="mt-4 space-y-2">
                {PERKS.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {p}
                  </li>
                ))}
              </ul>

              <button
                onClick={pay}
                disabled={phase !== "idle"}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(100deg,#635bff,#7a73ff)] text-sm font-semibold text-white shadow-[0_0_26px_-6px_rgba(99,91,255,0.85)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-80"
              >
                {phase === "idle" && (
                  <>
                    <CreditCard className="h-4 w-4" /> Start — ${PRO_PRICE}/mo
                  </>
                )}
                {phase === "redirecting" && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Opening secure checkout…
                  </>
                )}
                {phase === "processing" && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Confirming…
                  </>
                )}
                {phase === "done" && (
                  <>
                    <Check className="h-4 w-4" /> You&apos;re in
                  </>
                )}
              </button>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600">
                <a href="/pricing" className="underline hover:text-slate-400">
                  What&apos;s included
                </a>
                <span>Simulated checkout — no card charged</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
