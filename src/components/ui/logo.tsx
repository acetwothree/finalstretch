import { cn } from "@/lib/utils";

/** Small checkered finish-line flag on a pole. */
export function FlagMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5", className)}
      fill="none"
      aria-hidden
    >
      <rect x="3" y="2" width="1.7" height="20" rx="0.85" fill="currentColor" />
      <g transform="rotate(-4 5 4)">
        <clipPath id="flag-wave">
          <path d="M5 3 h14 q-1.5 3 0 6 q1.5 3 0 6 H5 Z" />
        </clipPath>
        <g clipPath="url(#flag-wave)">
          <rect x="5" y="3" width="14" height="12" fill="#0a0c14" />
          {Array.from({ length: 4 }).flatMap((_, r) =>
            Array.from({ length: 5 }).map((__, c) =>
              (r + c) % 2 === 0 ? (
                <rect
                  key={`${r}-${c}`}
                  x={5 + c * 2.8}
                  y={3 + r * 3}
                  width={2.8}
                  height={3}
                  fill="currentColor"
                />
              ) : null,
            ),
          )}
        </g>
        <path
          d="M5 3 h14 q-1.5 3 0 6 q1.5 3 0 6 H5 Z"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
          fill="none"
          opacity="0.55"
        />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <FlagMark className="h-5 w-5 text-violet-300" />
      <span className="text-sm font-semibold tracking-tight text-white">
        FinalStretch
      </span>
    </span>
  );
}
