"use client";

import {
  Apple,
  Boxes,
  Puzzle,
  Gamepad2,
  LayoutTemplate,
  MonitorSmartphone,
  Rocket,
  Server,
  Smartphone,
  Terminal,
  Wand2,
  Atom,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ITEMS: [LucideIcon, string][] = [
  [Apple, "iOS Apps"],
  [Atom, "React Web Apps"],
  [Wand2, "Next.js SaaS"],
  [Gamepad2, "Unity Games"],
  [Boxes, "Godot Games"],
  [Terminal, "Python Scripts"],
  [Rocket, "Steam Launches"],
  [Puzzle, "Chrome Extensions"],
  [Server, "Django APIs"],
  [Smartphone, "Expo / React Native"],
  [MonitorSmartphone, "Electron Apps"],
  [LayoutTemplate, "Landing Pages"],
];

function Row({ reverse = false }: { reverse?: boolean }) {
  const list = [...ITEMS, ...ITEMS];
  return (
    <div className="group flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]">
      <div
        className={`flex shrink-0 items-center gap-3 pr-3 ${
          reverse ? "animate-marquee-rev" : "animate-marquee"
        } group-hover:[animation-play-state:paused]`}
      >
        {list.map(([Icon, label], i) => (
          <span
            key={`${label}-${i}`}
            className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300"
          >
            <Icon className="h-4 w-4 text-violet-300" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProjectTicker() {
  return (
    <div className="space-y-3">
      <p className="text-center text-xs uppercase tracking-[0.25em] text-slate-500">
        Pulls in from every corner of the repo graveyard
      </p>
      <Row />
      <Row reverse />
    </div>
  );
}
