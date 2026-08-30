"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { useFlow } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { FinishLineSpinner } from "@/components/ui/finish-line-loader";

/**
 * A little box the user types corrections into ("we deploy on Hostinger, not
 * Vercel"). Submitting rebuilds the whole plan with that fact folded in.
 */
export function CorrectionField({
  taskId,
  placeholder,
  onSubmitted,
  className,
}: {
  taskId?: string;
  placeholder?: string;
  onSubmitted?: () => void;
  className?: string;
}) {
  const submitCorrection = useFlow((s) => s.submitCorrection);
  const revising = useFlow((s) => s.revising);
  const corrections = useFlow((s) => s.corrections);
  const [note, setNote] = useState("");

  const send = async () => {
    const v = note.trim();
    if (!v || revising) return;
    setNote("");
    onSubmitted?.();
    await submitCorrection(v, taskId);
  };

  return (
    <div className={className}>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void send();
          }
        }}
        rows={3}
        placeholder={
          placeholder ??
          "e.g. We deploy on Hostinger, not Vercel — drop the Vercel steps."
        }
        className="w-full resize-y rounded-lg border border-white/12 bg-white/[0.03] p-2.5 text-sm leading-relaxed text-slate-100 outline-none focus:border-violet-400/60"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500">
          {corrections.length > 0
            ? `${corrections.length} note${
                corrections.length === 1 ? "" : "s"
              } applied — this updates every step`
            : "This rebuilds the whole plan with your correction"}
        </span>
        <Button
          size="sm"
          onClick={() => void send()}
          disabled={!note.trim() || revising}
        >
          {revising ? (
            <>
              <FinishLineSpinner /> Updating…
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" /> Update the plan
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
