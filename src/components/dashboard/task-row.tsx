"use client";

import { Check, ChevronRight, Clock, Lock, Sparkles, X } from "lucide-react";
import { useFlow } from "@/lib/store";
import { AnimatedCheck } from "./animated-check";
import { cn, formatDuration } from "@/lib/utils";
import type { ChecklistTask, Severity } from "@/lib/types";

const SEVERITY: Record<Severity, { label: string; cls: string }> = {
  critical: { label: "critical", cls: "border-rose-400/30 bg-rose-500/10 text-rose-300" },
  high: { label: "high", cls: "border-amber-400/30 bg-amber-500/10 text-amber-300" },
  medium: { label: "medium", cls: "border-sky-400/30 bg-sky-500/10 text-sky-300" },
  low: { label: "low", cls: "border-slate-400/20 bg-slate-500/10 text-slate-300" },
};

export function TaskRow({
  task,
  locked = false,
}: {
  task: ChecklistTask;
  locked?: boolean;
}) {
  const toggleTask = useFlow((s) => s.toggleTask);
  const openCopilot = useFlow((s) => s.openCopilot);
  const openUnlock = useFlow((s) => s.openUnlock);
  const dismissTask = useFlow((s) => s.dismissTask);
  const sharedView = useFlow((s) => s.sharedView);
  const sev = SEVERITY[task.severity];

  const activate = () => (locked ? openUnlock("tasks") : void openCopilot(task.id));

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3.5 transition-colors duration-150",
        !locked && "hover:border-white/15 hover:bg-white/[0.04]",
        task.done && "opacity-55",
      )}
    >
      <div className="pt-0.5">
        <AnimatedCheck
          checked={task.done}
          onClick={() => (locked ? openUnlock("tasks") : toggleTask(task.id))}
        />
      </div>

      <button onClick={activate} className="min-w-0 flex-1 text-left">
        {locked ? (
          // redacted placeholder — no blur filter (cheap to scroll), and the
          // real text never reaches the DOM
          <div aria-hidden className="select-none">
            <div className="h-3.5 w-2/3 rounded bg-white/10" />
            <div className="mt-2 h-2.5 w-full rounded bg-white/[0.06]" />
            <div className="mt-1 h-2.5 w-2/5 rounded bg-white/[0.06]" />
          </div>
        ) : (
          <div>
            <p
              className={cn(
                "text-sm font-medium tracking-tight text-slate-100",
                task.done && "line-through decoration-slate-500",
              )}
            >
              {task.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
              {task.description}
            </p>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          {locked ? (
            <span className="flex items-center gap-1 text-violet-300/80">
              <Lock className="h-3 w-3" />
              Unlock to see this step
            </span>
          ) : (
            <>
              <span
                className={cn(
                  "rounded-md border px-1.5 py-0.5 font-medium",
                  sev.cls,
                )}
              >
                {sev.label}
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <Clock className="h-3 w-3" />
                {formatDuration(task.estMinutes)}
              </span>
            </>
          )}
          {locked ? null : task.execute ? (
            <span className="flex items-center gap-1 text-cyan-300">
              <Check className="h-3 w-3" />
              Executed
            </span>
          ) : (
            <span className="flex items-center gap-1 text-violet-300">
              <Sparkles className="h-3 w-3" />
              AI fix
            </span>
          )}
        </div>
      </button>

      <div className="mt-0.5 flex shrink-0 items-center">
        {!sharedView && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismissTask(task.id);
            }}
            aria-label="Remove this task — I don't need it"
            title="Not for me — remove"
            className="rounded-lg p-1.5 text-slate-600 opacity-0 transition-[opacity,color,background-color] hover:bg-white/5 hover:text-rose-300 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={activate}
          aria-label={locked ? "Unlock this task" : "Open AI co-pilot"}
          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          {locked ? <Lock className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
