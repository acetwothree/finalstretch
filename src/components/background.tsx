"use client";

import { motion } from "framer-motion";

/**
 * Ambient gradient glow. Translate-only animation on two blobs (no scale / no
 * filter animation) so it stays cheap and doesn't cause jank on interaction.
 */
export function Background() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-obsidian"
    >
      <motion.div
        className="absolute -left-40 -top-48 h-[38rem] w-[38rem] rounded-full bg-violet-600/20 blur-[90px] will-change-transform"
        animate={{ x: [0, 50, 0], y: [0, 40, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-32 bottom-[-14rem] h-[36rem] w-[36rem] rounded-full bg-indigo-500/15 blur-[100px] will-change-transform"
        animate={{ x: [0, -44, 0], y: [0, -32, 0] }}
        transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-grid opacity-60" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-obsidian to-transparent" />
    </div>
  );
}
