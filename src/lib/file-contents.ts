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

/** Read the current contents of the ~14 most relevant text files, for Execute. */
export async function gatherFileContents(meta: ProjectMeta): Promise<FileContent[]> {
  const wanted = pickSignalFiles(meta.fileTree, 40)
    .filter((p) => TEXT.test(p) || !p.includes("."))
    .slice(0, 14);

  const out: FileContent[] = [];
  let budget = TOTAL;

  const add = (path: string, raw: string) => {
    if (budget <= 0) return;
    const content = raw.slice(0, Math.min(PER_FILE, budget));
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
    await Promise.all(
      wanted.map(async (p) => {
        try {
          const r = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${p}`,
          );
          if (r.ok) add(p, await r.text());
        } catch {
          /* skip */
        }
      }),
    );
  }
  return out;
}
