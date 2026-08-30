"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function AnimatedCheck({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors",
        checked
          ? "border-emerald-400 bg-emerald-500/20 shadow-[0_0_16px_-2px_rgb(52_211_153/0.8)]"
          : "border-white/20 bg-white/[0.03] hover:border-violet-400/60",
      )}
    >
      <motion.svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        initial={false}
        animate={{ opacity: checked ? 1 : 0, scale: checked ? 1 : 0.5 }}
        transition={{ duration: 0.18 }}
      >
        <motion.path
          d="M5 12.5l4.5 4.5L19 7"
          fill="none"
          stroke="#34d399"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        />
      </motion.svg>
    </button>
  );
}
