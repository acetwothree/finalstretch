"use client";

import JSZip from "jszip";
import { getLastRawZip } from "./ingest";
import { slugify } from "./utils";
import type { ExecuteFile, ProjectMeta } from "./types";

function applyReadme(files: ExecuteFile[], meta: ProjectMeta) {
  const lines = [
    `# FinalStretch — applied changes for "${meta.name}"`,
    "",
    meta.source === "github"
      ? "This archive contains ONLY the files FinalStretch changed. Drop each one into your repo at the same path (overwrite), then commit."
      : "Extract this over your project folder — the changed files are already merged in.",
    "",
    "## Files",
    ...files.map(
      (f) =>
        `- ${f.action.toUpperCase()}  ${f.path}` +
        (f.action === "delete" ? "  (delete this file)" : ""),
    ),
  ];
  return lines.join("\n");
}

/**
 * Builds a downloadable archive with Claude's Execute edits applied. For a
 * dropped ZIP we merge into the original bytes; for GitHub (or after a refresh)
 * we emit just the changed files plus an APPLY readme.
 */
export async function buildPatchedArchive(
  meta: ProjectMeta,
  files: ExecuteFile[],
): Promise<{ blob: Blob; filename: string; merged: boolean }> {
  const raw = getLastRawZip();
  let zip: JSZip;
  let root = "";
  let merged = false;

  if (meta.source === "zip" && raw) {
    zip = await JSZip.loadAsync(raw.bytes);
    root = raw.root;
    merged = true;
  } else {
    zip = new JSZip();
    zip.file("_FINALSTRETCH_APPLY.md", applyReadme(files, meta));
  }

  for (const f of files) {
    const target = root + f.path;
    if (f.action === "delete") zip.remove(target);
    else zip.file(target, f.contents);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  return {
    blob,
    filename: `${slugify(meta.name) || "project"}-finalstretch.zip`,
    merged,
  };
}
