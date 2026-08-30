import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(n: number, lo = 0, hi = 100) {
  return Math.min(hi, Math.max(lo, n));
}

/** Coarse, honest-feeling time buckets (exact minute counts always felt wrong). */
export function formatDuration(mins: number) {
  if (mins <= 12) return "a few min";
  if (mins <= 25) return "~20 min";
  if (mins <= 45) return "~40 min";
  if (mins <= 75) return "~1 hr";
  return "1 hr+";
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export function pluralize(n: number, singular: string, plural = `${singular}s`) {
  return n === 1 ? singular : plural;
}
