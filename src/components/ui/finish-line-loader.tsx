import { cn } from "@/lib/utils";

/**
 * The house loading animation: a checkered "finish line" that fills across the
 * track and flashes as it crosses. Used for any panel-level wait.
 */
export function FinishLineBar({
  label,
  sub,
  className,
}: {
  label?: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-col items-center gap-3", className)}>
      <div className="relative h-3.5 w-64 max-w-[80%] overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
        <div className="fl-race fl-checkers absolute inset-y-0 left-0 shadow-[0_0_14px_2px_rgb(139_92_246/0.5)]" />
        {/* the finish line + its flash */}
        <div className="absolute inset-y-0 right-1.5 w-px bg-white/45" />
        <div className="fl-flag-flash absolute inset-y-0 right-0 w-6 bg-[radial-gradient(circle_at_right,rgb(255_255_255/0.7),transparent_70%)]" />
      </div>
      {label && (
        <p className="text-center text-sm font-medium text-slate-300">{label}</p>
      )}
      {sub && <p className="text-center text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

/** Inline gradient-ring spinner (violet → cyan) for buttons and tight spots. */
export function FinishLineSpinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("fl-spinner inline-block h-4 w-4 shrink-0", className)}
    />
  );
}
