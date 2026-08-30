"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, FileArchive, FolderGit2, Loader2, UploadCloud } from "lucide-react";
import { useFlow } from "@/lib/store";
import { cn } from "@/lib/utils";
import { IngestErrorCard } from "@/components/ingest-error-card";

const GITHUB_RE = /github\.com[/:][\w.-]+\/[\w.-]+/i;

export function Dropzone() {
  const startZip = useFlow((s) => s.startZip);
  const startGithub = useFlow((s) => s.startGithub);
  const ingesting = useFlow((s) => s.ingesting);
  const error = useFlow((s) => s.error);
  const ingestError = useFlow((s) => s.ingestError);
  const clearIngestError = useFlow((s) => s.clearIngestError);

  const [dragging, setDragging] = useState(false);
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void startZip(file);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void startZip(file);
    e.target.value = "";
  }

  function submitUrl(e: React.FormEvent) {
    e.preventDefault();
    if (GITHUB_RE.test(url)) void startGithub(url);
  }

  const urlValid = GITHUB_RE.test(url);

  return (
    <div className="w-full">
      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        animate={{ scale: dragging ? 1.015 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-colors duration-200",
          dragging
            ? "border-violet-400 bg-violet-500/10"
            : "border-white/15 bg-white/[0.025] hover:border-violet-400/50 hover:bg-white/[0.04]",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300",
            dragging ? "opacity-100" : "group-hover:opacity-100",
          )}
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(139,92,246,0.18), transparent 60%)",
          }}
        />

        <div className="relative flex flex-col items-center gap-4">
          <motion.div
            animate={{ y: dragging ? -4 : 0 }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/10 shadow-[0_0_30px_-6px_rgb(139_92_246/0.7)]"
          >
            {ingesting ? (
              <Loader2 className="h-7 w-7 animate-spin text-violet-300" />
            ) : dragging ? (
              <FileArchive className="h-7 w-7 text-violet-200" />
            ) : (
              <UploadCloud className="h-7 w-7 text-violet-200" />
            )}
          </motion.div>

          <div className="space-y-1.5">
            <p className="text-lg font-semibold tracking-tight text-white sm:text-xl">
              {ingesting
                ? "Reading your project…"
                : "Drop your project ZIP or paste a GitHub link"}
            </p>
            <p className="text-sm text-slate-400">
              Click to browse — the archive is parsed in your browser, never uploaded.
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={onPick}
        />
      </motion.div>

      <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-600">
        <span className="h-px flex-1 bg-white/10" />
        or
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onClick={(e) => e.stopPropagation()} onSubmit={submitUrl} className="relative">
        <FolderGit2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/you/almost-done-app"
          spellCheck={false}
          className="h-13 w-full rounded-xl border border-white/12 bg-white/[0.03] pl-12 pr-14 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-violet-400/60 focus:bg-white/[0.05]"
        />
        <button
          type="submit"
          disabled={!urlValid || ingesting}
          aria-label="Analyze repository"
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white transition-all hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <AnimatePresence mode="wait">
        {ingestError ? (
          <IngestErrorCard
            key="card"
            error={ingestError}
            onBrowse={() => {
              clearIngestError();
              inputRef.current?.click();
            }}
            onDismiss={clearIngestError}
          />
        ) : error ? (
          <motion.p
            key="line"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-sm text-rose-300"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
