"use client";

import { motion } from "framer-motion";
import { FlagMark } from "@/components/ui/logo";

export function BootSplash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: [0.4, 1, 0.4], scale: 1 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="text-violet-300"
      >
        <FlagMark className="h-9 w-9" />
      </motion.div>
    </div>
  );
}
