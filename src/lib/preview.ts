"use client";

import JSZip from "jszip";
import { getLastRawZip } from "./ingest";
import type { ExecuteFile, ProjectMeta } from "./types";

export function parseOwnerRepo(url?: string) {
  const m = url?.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/|$)/i);
  return m ? { owner: m[1], repo: m[2] } : null;
}

const WEB_STACK = /next|react|vite|vue|svelte|nuxt|astro|remix|solid|preact/i;

/** Can StackBlitz / a browser actually run this? (JS/web projects only.) */
export function canRunInBrowser(meta: ProjectMeta) {
  if (meta.platform === "web") return true;
  if (WEB_STACK.test(meta.detectedStack.join(" "))) return true;
  return meta.fileTree.some((p) => p === "package.json" || p.endsWith("/package.json"));
}

export function stackblitzTemplate(files: Record<string, string>): "node" | "html" {
  return "package.json" in files || Object.keys(files).some((k) => k.endsWith("/package.json"))
    ? "node"
    : "html";
}

const SKIP_DIR = /(^|\/)(node_modules|\.git|\.next|dist|build|out|\.turbo|coverage|\.expo)\//i;
const BINARY = /\.(png|jpe?g|gif|webp|ico|icns|svg|woff2?|ttf|eot|mp[34]|mov|zip|pdf|lock|wasm|node|dll|so|dylib|jar|class|ipa|apk)$/i;
const PER_FILE = 220_000;
const TOTAL = 4_000_000;
const MAX_FILES = 420;

/** Read the project's text files (from the dropped ZIP) into a StackBlitz file map. */
export async function buildFileMap(
  overlay: ExecuteFile[] = [],
): Promise<Record<string, string> | null> {
  const raw = getLastRawZip();
  if (!raw) return null;

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(raw.bytes);
  } catch {
    return null;
  }

  const files: Record<string, string> = {};
  let total = 0;
  const entries = Object.keys(zip.files).filter((p) => !zip.files[p].dir);

  for (const full of entries) {
    if (Object.keys(files).length >= MAX_FILES || total >= TOTAL) break;
    if (SKIP_DIR.test(full) || BINARY.test(full)) continue;
    const rel = raw.root && full.startsWith(raw.root) ? full.slice(raw.root.length) : full;
    if (!rel) continue;
    try {
      const content = await zip.files[full].async("string");
      if (content.length > PER_FILE) continue;
      files[rel] = content;
      total += content.length;
    } catch {
      /* skip unreadable */
    }
  }

  for (const f of overlay) {
    if (f.action === "delete") delete files[f.path];
    else files[f.path] = f.contents;
  }

  return Object.keys(files).length ? files : null;
}
