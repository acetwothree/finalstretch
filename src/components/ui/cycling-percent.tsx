"use client";

import { useEffect, useRef, useState } from "react";

const VALUES = [65, 70, 80, 85, 90];
const HOLD_MS = 2200;
const STEP_MS = 70;

/** Gradient percentage that slowly counts between a loop of values. */
export function CyclingPercent() {
  const [n, setN] = useState(VALUES[0]);
  const cur = useRef(VALUES[0]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setN(80);
      return;
    }

    let idx = 0;
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;

    const advance = () => {
      idx = (idx + 1) % VALUES.length;
      const target = VALUES[idx];
      const dir = target > cur.current ? 1 : -1;
      const tick = () => {
        if (!alive) return;
        if (cur.current === target) {
          timer = setTimeout(advance, HOLD_MS);
          return;
        }
        cur.current += dir;
        setN(cur.current);
        timer = setTimeout(tick, STEP_MS);
      };
      tick();
    };

    timer = setTimeout(advance, HOLD_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  return <span className="text-gradient tabular-nums">{n}%</span>;
}
