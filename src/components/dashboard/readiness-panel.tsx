"use client";

import { TASK_CATEGORIES } from "@/lib/types";
import { ProgressRing } from "@/components/ui/progress-ring";
import { GlowCard } from "@/components/ui/glow-card";
import { formatDuration } from "@/lib/utils";
import type { ChecklistTask } from "@/lib/types";

function momentum(v: number) {
  if (v >= 100) return "Ship it 🚀";
  if (v >= 90) return "One good session from done";
  if (v >= 60) return "Picking up real speed";
  if (v >= 35) return "Out of the woods";
  return "Just getting started";
}

export function ReadinessPanel({
  readiness,
  tasks,
}: {
  readiness: number;
  tasks: ChecklistTask[];
}) {
  const remaining = tasks.filter((t) => !t.done);
  const minsLeft = remaining.reduce((s, t) => s + t.estMinutes, 0);

  return (
    <GlowCard className="sticky top-6 p-6">
      <div className="flex flex-col items-center">
        <ProgressRing value={readiness} />
        <p className="mt-3 text-sm font-medium text-white">{momentum(readiness)}</p>
        <p className="text-xs text-slate-500">
          {remaining.length
            ? `${remaining.length} left · ≈ ${formatDuration(minsLeft)} of work`
            : "Every task cleared"}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {TASK_CATEGORIES.map((cat) => {
          const inCat = tasks.filter((t) => t.category === cat);
          const done = inCat.filter((t) => t.done).length;
          const pct = inCat.length ? (done / inCat.length) * 100 : 0;
          return (
            <div key={cat}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-slate-400">{cat}</span>
                <span className="font-mono text-slate-500">
                  {done}/{inCat.length}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </GlowCard>
  );
}
