"use client";

import { Lock, Sparkles } from "lucide-react";
import { PRO_PRICE, useFlow } from "@/lib/store";

export function PaywallCard({ lockedCount }: { lockedCount: number }) {
  const openUnlock = useFlow((s) => s.openUnlock);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-400/30 bg-[linear-gradient(135deg,rgba(139,92,246,0.14),rgba(99,102,241,0.06))] p-5">
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/10">
            <Lock className="h-4 w-4 text-violet-200" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">
              {lockedCount} more steps
            </p>
            <p className="mt-0.5 max-w-md text-xs leading-relaxed text-slate-400">
              See the whole plan, and get the &ldquo;do it for me&rdquo; button on
              every step.
            </p>
          </div>
        </div>
        <button
          onClick={() => openUnlock("tasks")}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-sm font-semibold text-white shadow-[0_0_25px_-4px_rgb(139_92_246/0.8)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.97]"
        >
          <Sparkles className="h-4 w-4" />
          ${PRO_PRICE}/mo
        </button>
      </div>
    </div>
  );
}
