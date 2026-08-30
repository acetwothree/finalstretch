"use client";

import { motion } from "framer-motion";
import { clamp } from "@/lib/utils";

export function Progress({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const v = clamp(value);
  return (
    <div
      className={`relative h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06] ${className}`}
    >
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 via-indigo-400 to-emerald-400"
        initial={false}
        animate={{ width: `${v}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      >
        <div className="absolute inset-0 rounded-full shadow-[0_0_18px_2px_rgb(139_92_246/0.55)]" />
      </motion.div>
    </div>
  );
}
