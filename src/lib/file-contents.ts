"use client";

import JSZip from "jszip";
import { getLastRawZip } from "./ingest";
import { parseGithubUrl } from "./ingest";
import { pickSignalFiles } from "./signal-files";
import type { ProjectMeta } from "./types";

export interface FileContent {
  path: string;
  content: string;
}

const TEXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|txt|py|rb|go|rs|java|kt|swift|cs|php|css|scss|html|yml|yaml|toml|env|sh|xml|plist|prisma|svelte|vue|gradle|gitignore|npmignore)$/i;
const PER_FILE = 8000;
const TOTAL = 48000;

async function readFiles(
  meta: ProjectMeta,
  wanted: string[],
  perFile: number,
  total: number,
): Promise<FileContent[]> {
  const out: FileContent[] = [];
  let budget = total;
  const add = (path: string, raw: string) => {
    if (budget <= 0) return;
    const content = raw.slice(0, Math.min(perFile, budget));
    budget -= content.length;
    out.push({ path, content });
  };

  const raw = getLastRawZip();
  if (meta.source === "zip" && raw) {
    try {
      const zip = await JSZip.loadAsync(raw.bytes);
      for (const p of wanted) {
        const f = zip.file(raw.root + p) ?? zip.file(p);
        if (f) add(p, await f.async("string"));
      }
    } catch {
      /* fall through */
    }
    return out;
  }

  const parsed = meta.githubUrl ? parseGithubUrl(meta.githubUrl) : null;
  if (parsed) {
    const { owner, repo } = parsed;
    const fetched = await Promise.all(
      wanted.map(async (p) => {
        try {
          const r = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${p}`,
          );
          return r.ok ? ([p, await r.text()] as const) : null;
        } catch {
          return null;
        }
      }),
    );
    for (const hit of fetched) if (hit) add(hit[0], hit[1]);
  }
  return out;
}

/** Read the current contents of the ~14 most relevant text files, for Execute. */
export function gatherFileContents(meta: ProjectMeta): Promise<FileContent[]> {
  const wanted = pickSignalFiles(meta.fileTree, 40)
    .filter((p) => TEXT.test(p) || !p.includes("."))
    .slice(0, 14);
  return readFiles(meta, wanted, PER_FILE, TOTAL);
}

const ENTRY =
  /(^|\/)(readme[\w.-]*|package\.json|src\/(main|index|app)\.[jt]sx?|app\/page\.[jt]sx?|pages\/(index|_app)\.[jt]sx?|src\/App\.[jt]sx?|index\.html|main\.[jt]sx?|game\.[jt]s|src\/game[\w/.-]*\.[jt]sx?)$/i;

/**
 * A few high-signal files (README first, then the entry point + a couple of core
 * source files) so the FREE scan can actually read the project, not just guess
 * from filenames. Kept small — ~8 files — to stay cheap.
 */
export function gatherScanFiles(meta: ProjectMeta): Promise<FileContent[]> {
  const signal = pickSignalFiles(meta.fileTree, 60).filter(
    (p) => TEXT.test(p) || !p.includes("."),
  );
  const priority = signal.filter((p) => ENTRY.test(p));
  const rest = signal.filter((p) => !ENTRY.test(p) && /\.(tsx?|jsx?|svelte|vue)$/i.test(p));
  const wanted = [...new Set([...priority, ...rest])].slice(0, 8);
  return readFiles(meta, wanted, 2600, 18000);
}
