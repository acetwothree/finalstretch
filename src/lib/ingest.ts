"use client";

import JSZip from "jszip";
import { classify } from "./classify";
import type { ProjectMeta } from "./types";

const IGNORE =
  /(^|\/)(node_modules|\.git|\.next|\.turbo|dist|build|out|coverage|\.venv|venv|env|__pycache__|Pods|DerivedData|\.gradle|target|bin|obj|Library|Temp|\.expo)\//i;

/** A recoverable ingestion problem with a concrete walkthrough for the user. */
export class IngestError extends Error {
  title: string;
  steps: string[];
  /** What the retry affordance should offer. */
  fix: "url" | "zip" | "retry" | "none";

  constructor(title: string, steps: string[], fix: IngestError["fix"] = "none") {
    super(title);
    this.name = "IngestError";
    this.title = title;
    this.steps = steps;
    this.fix = fix;
  }
}

/**
 * Raw bytes of the last dropped ZIP, kept in memory (not persisted) so Pro
 * "Apply changes" can merge Claude's edits back into the real archive.
 */
let lastRawZip: { root: string; bytes: ArrayBuffer } | null = null;
export function getLastRawZip() {
  return lastRawZip;
}

function commonRoot(paths: string[]) {
  if (!paths.length) return "";
  const first = paths[0].split("/")[0];
  if (!first) return "";
  return paths.every((p) => p.startsWith(first + "/")) ? first + "/" : "";
}

function cleanName(raw: string) {
  return raw.replace(/\.zip$/i, "").replace(/[-_]+/g, " ").trim() || "Your project";
}

/* -------------------------------- ZIP --------------------------------- */

export async function analyzeZip(file: File): Promise<ProjectMeta> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new IngestError(
      "That file isn't a readable ZIP archive.",
      [
        "Make sure it's a .zip — not .rar, .7z, or .tar.gz.",
        "Re-create it: right-click your project folder → Compress / Send to → ZIP.",
        "Then drop the new .zip here.",
      ],
      "zip",
    );
  }

  const all = Object.keys(zip.files).filter((p) => !zip.files[p].dir);
  if (!all.length) {
    throw new IngestError("That ZIP is empty.", [
      "Zip the folder that actually contains your code (the one with package.json, or your source files).",
      "Don't zip an empty or parent folder.",
    ], "zip");
  }

  const kept = all.filter((p) => !IGNORE.test(p));
  if (!kept.length) {
    throw new IngestError(
      "Couldn't find any project files in that ZIP.",
      [
        "It looks like it only contains build output (node_modules, dist, .next…).",
        "Zip your source folder instead — the one with package.json / your app code.",
      ],
      "zip",
    );
  }

  const root = commonRoot(kept);
  const rel = kept.map((p) => (root && p.startsWith(root) ? p.slice(root.length) : p));

  try {
    lastRawZip = { root, bytes: await file.arrayBuffer() };
  } catch {
    lastRawZip = null;
  }

  let pkg: unknown = null;
  const pkgKey =
    kept.find((p) => (root ? p === root + "package.json" : p === "package.json")) ??
    kept.find((p) => p.endsWith("/package.json"));
  if (pkgKey) {
    try {
      pkg = JSON.parse(await zip.files[pkgKey].async("string"));
    } catch {
      /* malformed package.json — classify() copes without it */
    }
  }

  const info = classify(rel, pkg as never);
  return {
    name: cleanName(file.name),
    source: "zip",
    fileCount: kept.length,
    fileTree: rel.sort().slice(0, 600),
    ...info,
  };
}

/* ------------------------------- GitHub ------------------------------- */

export function parseGithubUrl(raw: string) {
  const s = raw.trim().replace(/[?#].*$/, "");
  const m = s.match(
    /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/(tree|blob)\/([^/]+)(\/.*)?)?\/?$/i,
  );
  if (!m) return null;
  return {
    owner: m[1],
    repo: m[2],
    kind: (m[3] as "tree" | "blob" | undefined) ?? "repo",
    ref: m[4] as string | undefined,
    subpath: m[5]?.replace(/^\//, ""),
  };
}

async function ghGet(path: string) {
  return fetch(`https://api.github.com/${path}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
}

export async function analyzeGithub(url: string): Promise<ProjectMeta> {
  const parsed = parseGithubUrl(url);
  if (!parsed) {
    throw new IngestError(
      "That doesn't look like a GitHub repository link.",
      [
        "Open your repo on github.com and copy the URL from the address bar.",
        "It should look like: https://github.com/your-name/your-repo",
        "Links to a single file, a folder, or a pull request won't work — use the repo's main page.",
      ],
      "url",
    );
  }

  const { owner, repo, kind, subpath } = parsed;
  const slug = `${owner}/${repo}`;

  // 1. repo metadata — this is where private / typo errors surface
  const repoRes = await ghGet(`repos/${slug}`).catch(() => null);
  if (!repoRes) {
    throw new IngestError(
      "Couldn't reach GitHub.",
      ["Check your internet connection.", "Or drop a .zip of the project instead."],
      "zip",
    );
  }

  if (repoRes.status === 404) {
    throw new IngestError(
      `GitHub can't find "${slug}".`,
      [
        "Double-check the spelling of the owner and repo name.",
        "If the repo is private: open it on GitHub → Settings → scroll to “Danger Zone” → Change visibility → Make public, then paste the link again.",
        "Prefer to keep it private? Download it as a ZIP (green “Code” button → Download ZIP) and drop that here — it never leaves your browser.",
      ],
      "zip",
    );
  }

  if (repoRes.status === 403 || repoRes.status === 429) {
    const reset = repoRes.headers.get("x-ratelimit-remaining") === "0";
    throw new IngestError(
      reset
        ? "GitHub is rate-limiting anonymous requests from your network right now."
        : "GitHub refused that request.",
      [
        reset ? "Wait about a minute and hit analyze again." : "The repo may be blocked or restricted.",
        "Or skip the wait: download the repo as a ZIP (green “Code” button → Download ZIP) and drop it here.",
      ],
      "zip",
    );
  }

  if (!repoRes.ok) {
    throw new IngestError(
      `GitHub returned an error (${repoRes.status}).`,
      ["Try again in a moment.", "Or drop a .zip of the project instead."],
      "zip",
    );
  }

  const repoInfo = await repoRes.json();
  const branch = parsed.ref || repoInfo.default_branch || "main";

  // 2. file tree
  const treeRes = await ghGet(`repos/${slug}/git/trees/${branch}?recursive=1`);
  if (treeRes.status === 409 || repoInfo.size === 0) {
    throw new IngestError(
      `"${slug}" doesn't have any files yet.`,
      [
        "Push your code to the repo first, then paste the link again.",
        "Or drop a .zip of your local project folder.",
      ],
      "zip",
    );
  }
  if (!treeRes.ok) {
    throw new IngestError(
      `Couldn't read the file list for "${slug}" (branch ${branch}).`,
      [
        parsed.ref
          ? `The branch "${branch}" from your link may not exist — try the plain repo URL.`
          : "The default branch couldn't be read.",
        "Or drop a .zip of the project instead.",
      ],
      "url",
    );
  }

  const tree = await treeRes.json();
  const paths: string[] = (tree.tree ?? [])
    .filter((n: { type: string }) => n.type === "blob")
    .map((n: { path: string }) => n.path)
    .filter((p: string) => !IGNORE.test(p));

  if (!paths.length) {
    throw new IngestError(`"${slug}" has no source files to scan.`, [
      "The repo may only contain binaries or build output.",
      "Point FinalStretch at the repo that holds your actual code.",
    ]);
  }

  // 3. root package.json for richer detection (optional)
  let pkg: unknown = null;
  try {
    const pj = await ghGet(`repos/${slug}/contents/package.json?ref=${branch}`);
    if (pj.ok) {
      const body = await pj.json();
      pkg = JSON.parse(atob(String(body.content).replace(/\n/g, "")));
    }
  } catch {
    /* no root package.json — fine */
  }

  const info = classify(paths, pkg as never, repoInfo.language ?? undefined);
  const notes = [...info.notes];
  if (kind === "blob" && subpath)
    notes.unshift(`Your link pointed at "${subpath}" — scanned the whole repo instead.`);
  else if (kind === "tree" && subpath)
    notes.unshift(`Your link pointed at the "${subpath}" folder — scanned the whole repo.`);

  return {
    name: repoInfo.name ?? repo,
    source: "github",
    githubUrl: repoInfo.html_url ?? url,
    fileCount: paths.length,
    fileTree: paths.sort().slice(0, 600),
    ...info,
    notes: notes.slice(0, 7),
  };
}
