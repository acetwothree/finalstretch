"use client";

import { motion, type Variants } from "framer-motion";
import { Dropzone } from "@/components/dropzone";
import { CyclingPercent } from "@/components/ui/cycling-percent";

const fade: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.55, ease: "easeOut" },
  }),
};

export function Hero() {
  return (
    <section className="relative mx-auto flex max-w-3xl flex-col items-center px-5 pt-20 text-center sm:pt-28">
      <motion.h1
        custom={0}
        variants={fade}
        initial="hidden"
        animate="show"
        className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl"
      >
        You built <CyclingPercent /> of your app.
        <br />
        Let&apos;s finish the rest together.
      </motion.h1>

      <motion.p
        custom={1}
        variants={fade}
        initial="hidden"
        animate="show"
        className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-slate-400 sm:text-lg"
      >
        Drop your messy codebase. Get an AI diagnosis. Clear the checklist. Launch.
      </motion.p>

      <motion.div
        custom={2}
        variants={fade}
        initial="hidden"
        animate="show"
        className="mt-9 w-full"
      >
        <Dropzone />
      </motion.div>

      <motion.p
        custom={3}
        variants={fade}
        initial="hidden"
        animate="show"
        className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-500"
      >
        <span>No signup</span>
        <span className="text-slate-700">•</span>
        <span>Reads 40+ stacks</span>
        <span className="text-slate-700">•</span>
        <span>ZIPs parsed in your browser</span>
      </motion.p>
    </section>
  );
}
