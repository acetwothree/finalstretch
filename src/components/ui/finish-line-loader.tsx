"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The house loading animation: a checkered "finish line" that advances toward
 * the line over an estimated wait, then holds near the end (with a live sheen)
 * until the real work finishes. Not an infinite fill/unfill.
 */
export function FinishLineBar({
  label,
  sub,
  /** Rough expected wait. The bar eases to ~93% over this, then holds. */
  etaMs = 12000,
  className,
}: {
  label?: string;
  sub?: string;
  etaMs?: number;
  className?: string;
}) {
  const [w, setW] = useState(6);
  useEffect(() => {
    const t = setTimeout(() => setW(93), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3",
        className,
      )}
    >
      <div className="relative h-3.5 w-64 max-w-full overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
        <div
          className="fl-checkers absolute inset-y-0 left-0 overflow-hidden rounded-r-full shadow-[0_0_14px_2px_rgb(139_92_246/0.5)]"
          style={{
            width: `${w}%`,
            transition: `width ${etaMs}ms cubic-bezier(0.06, 0.7, 0.08, 1)`,
          }}
        >
          <span className="fl-bar-sheen absolute inset-0" />
        </div>
        <div className="absolute inset-y-0 right-1.5 w-px bg-white/45" />
      </div>
      {label && (
        <p className="max-w-xs text-center text-sm font-medium text-slate-300">
          {label}
        </p>
      )}
      {sub && (
        <p className="max-w-xs text-center text-xs text-slate-500">{sub}</p>
      )}
    </div>
  );
}

/** Inline two-tone ring spinner (violet + cyan) for buttons and tight spots. */
export function FinishLineSpinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("fl-spinner inline-block h-4 w-4 shrink-0", className)}
    />
  );
}
