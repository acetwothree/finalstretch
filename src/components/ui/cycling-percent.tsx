"use client";

import { useEffect, useRef, useState } from "react";

const VALUES = [65, 70, 80, 85, 90];
const HOLD_MS = 1400;
const STEP_MS = 30;

/**
 * Electric gradient percentage that smoothly counts between a loop of values.
 * Timer-driven (not rAF) so it keeps ticking even when the tab isn't composited.
 */
export function CyclingPercent() {
  const [n, setN] = useState(VALUES[0]);
  const cur = useRef(VALUES[0]);

  useEffect(() => {
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

  return (
    <span className="relative inline-block align-baseline tabular-nums">
      <span className="text-gradient">{n}%</span>
      <span
        aria-hidden
        className="text-gradient pointer-events-none absolute inset-0 opacity-60 blur-[14px]"
      >
        {n}%
      </span>
    </span>
  );
}
