"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  GitPullRequest,
  Loader2,
  Play,
  RotateCcw,
  TriangleAlert,
  Wand2,
  X,
} from "lucide-react";
import { EXECUTE_LIMIT, useFlow } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className="flex items-center gap-1 text-[11px] text-slate-400 transition-colors hover:text-white"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="truncate font-mono text-[11px] text-slate-500">{label}</span>
        <CopyBtn text={code} />
      </div>
      <pre className="max-h-60 overflow-auto p-3 font-mono text-xs leading-relaxed text-slate-200">
        {code}
      </pre>
    </div>
  );
}

/* ------------------------- result of a change ------------------------- */

function ChangeResult({ taskId }: { taskId: string }) {
  const task = useFlow((s) => s.checklist?.tasks.find((t) => t.id === taskId));
  const meta = useFlow((s) => s.meta);
  const applyExecute = useFlow((s) => s.applyExecute);
  const applyBusy = useFlow((s) => s.applyBusy);
  const applied = useFlow((s) => s.appliedTaskId === taskId);
  const discardExecute = useFlow((s) => s.discardExecute);
  const githubToken = useFlow((s) => s.githubToken);
  const setGithubToken = useFlow((s) => s.setGithubToken);
  const openPullRequest = useFlow((s) => s.openPullRequest);
  const pr = useFlow((s) => s.prByTask[taskId]);
  const prBusy = useFlow((s) => s.prBusy === taskId);
  const prError = useFlow((s) => s.prError);
  const openPreview = useFlow((s) => s.openPreview);
  const closeCopilot = useFlow((s) => s.closeCopilot);

  const [token, setToken] = useState("");
  const [showConnect, setShowConnect] = useState(false);
  const [showFiles, setShowFiles] = useState(false);

  const r = task?.execute;
  if (!r || !meta) return null;

  const isGithub = meta.source === "github";
  const isMock = r.source === "mock";
  const fileCount = r.files.length;

  return (
    <div className="space-y-3 rounded-xl border border-cyan-400/25 bg-cyan-500/[0.05] p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-cyan-200">
          {isMock ? (
            <>
              <TriangleAlert className="h-4 w-4" /> Couldn&apos;t do it
            </>
          ) : (
            <>
              <Check className="h-4 w-4" /> Change ready
            </>
          )}
        </span>
        <button
          onClick={() => discardExecute(taskId)}
          className="flex items-center gap-1 text-[11px] text-slate-400 transition-colors hover:text-rose-300"
        >
          <RotateCcw className="h-3 w-3" /> Undo
        </button>
      </div>

      <p className="text-sm leading-relaxed text-slate-200">{r.summary}</p>

      {r.note && (
        <p className="flex items-start gap-1.5 rounded-md border border-amber-400/25 bg-amber-500/10 p-2 text-xs text-amber-200">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {r.note}
        </p>
      )}

      {!isMock && (
        <>
          {/* primary action */}
          {pr ? (
            <a
              href={pr.url}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-500/20"
            >
              <GitPullRequest className="h-4 w-4" />
              Open pull request #{pr.number} on GitHub
            </a>
          ) : isGithub && githubToken ? (
            <button
              onClick={() => void openPullRequest(taskId)}
              disabled={prBusy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 text-sm font-semibold text-white shadow-[0_0_22px_-6px_rgb(34_211_238/0.85)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
            >
              {prBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Pushing to GitHub…
                </>
              ) : (
                <>
                  <GitPullRequest className="h-4 w-4" /> Push it to GitHub
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => void applyExecute()}
              disabled={applyBusy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 text-sm font-semibold text-white shadow-[0_0_22px_-6px_rgb(34_211_238/0.85)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
            >
              {applyBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Preparing download…
                </>
              ) : applied ? (
                <>
                  <Check className="h-4 w-4" /> Downloaded — get it again
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" /> Download my updated project
                </>
              )}
            </button>
          )}

          {/* secondary option */}
          {!pr && isGithub && githubToken && (
            <button
              onClick={() => void applyExecute()}
              className="w-full text-center text-xs text-slate-400 underline hover:text-white"
            >
              or just download the files
            </button>
          )}
          {!pr && isGithub && !githubToken && (
            <div>
              <button
                onClick={() => setShowConnect((v) => !v)}
                className="w-full text-center text-xs text-slate-400 underline hover:text-white"
              >
                or push it straight to GitHub as a pull request
              </button>
              {showConnect && (
                <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Paste a GitHub{" "}
                    <a
                      href="https://github.com/settings/tokens?type=beta"
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-slate-300"
                    >
                      access token
                    </a>{" "}
                    (Contents + Pull requests, read/write on this repo). Stays in
                    your browser only.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="github_pat_…"
                      className="h-9 flex-1 rounded-lg border border-white/12 bg-white/[0.03] px-2.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/50"
                    />
                    <Button size="sm" variant="outline" onClick={() => setGithubToken(token)}>
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          {!pr && !isGithub && (
            <div>
              <button
                onClick={() => setShowConnect((v) => !v)}
                className="w-full text-center text-xs text-slate-400 underline hover:text-white"
              >
                want one-click GitHub pushing next time?
              </button>
              {showConnect && (
                <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <p className="mb-2 text-[11px] text-slate-500">
                    Put this project on GitHub once, then re-scan with the link:
                  </p>
                  <CodeBlock
                    label="run these in your project folder"
                    code={[
                      "git init && git add -A && git commit -m \"start\"",
                      "# make an empty repo at github.com/new, then:",
                      "git remote add origin https://github.com/you/your-repo.git",
                      "git push -u origin main",
                    ].join("\n")}
                  />
                </div>
              )}
            </div>
          )}
          {prError && <p className="text-[11px] text-rose-300">{prError}</p>}

          <button
            onClick={() => {
              closeCopilot();
              openPreview(taskId);
            }}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.03] text-xs font-medium text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-white"
          >
            <Play className="h-3.5 w-3.5" />
            Preview this change in the browser
          </button>
        </>
      )}

      {/* what changed — collapsed */}
      <div className="border-t border-white/10 pt-2">
        <button
          onClick={() => setShowFiles((v) => !v)}
          className="flex w-full items-center justify-between text-xs text-slate-400 hover:text-white"
        >
          {isMock ? "See the plan" : `See what changed (${fileCount} file${fileCount === 1 ? "" : "s"})`}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showFiles && "rotate-180")} />
        </button>
        {showFiles && (
          <div className="mt-2 space-y-2">
            {r.files.map((f) => (
              <div key={f.path}>
                <p className="mb-1 font-mono text-[11px] text-slate-500">
                  {f.action} · {f.path}
                </p>
                {f.action !== "delete" && <CodeBlock code={f.contents} label={f.path} />}
              </div>
            ))}
            {r.commands.length > 0 && (
              <CodeBlock code={r.commands.join("\n")} label="then run" />
            )}
            {r.runLocally && (
              <p className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5 text-[11px] leading-relaxed text-slate-400">
                {r.runLocally}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------- the drawer --------------------------- */

export function CopilotDrawer() {
  const taskId = useFlow((s) => s.copilotTaskId);
  const loading = useFlow((s) => s.copilotLoading);
  const close = useFlow((s) => s.closeCopilot);
  const toggleTask = useFlow((s) => s.toggleTask);
  const startExecute = useFlow((s) => s.startExecute);
  const runExecute = useFlow((s) => s.runExecute);
  const cancelExecute = useFlow((s) => s.cancelExecute);
  const executeAsk = useFlow((s) => s.executeAsk);
  const executeInstructions = useFlow((s) => s.executeInstructions);
  const setExecuteInstructions = useFlow((s) => s.setExecuteInstructions);
  const executeLoading = useFlow((s) => s.executeLoading);
  const plan = useFlow((s) => s.plan);
  const executesUsed = useFlow((s) => s.executesUsed);
  const task = useFlow((s) => s.checklist?.tasks.find((t) => t.id === s.copilotTaskId));

  const [note, setNote] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [showPlan, setShowPlan] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    // reset the little ask-form state when switching tasks / closing
    setNote("");
    setAdvanced(false);
    setShowPlan(false);
  }, [taskId, executeAsk]);

  const asking = executeAsk === taskId;

  function run() {
    if (!advanced && note.trim()) {
      setExecuteInstructions(
        `${executeInstructions}\n\nAlso from the user: ${note.trim()}`,
      );
    }
    void runExecute(true);
  }

  return (
    <AnimatePresence>
      {taskId && task && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-50 bg-obsidian/75"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[520px] flex-col border-l border-violet-400/20 bg-obsidian-soft shadow-[-20px_0_60px_-20px_rgb(139_92_246/0.5)]"
          >
            <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
              <h3 className="text-base font-semibold leading-snug tracking-tight text-white">
                {task.title}
              </h3>
              <button
                onClick={close}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {loading || !task.copilot ? (
                <div className="space-y-3">
                  {[80, 95, 70, 55].map((w, i) => (
                    <div key={i} className="shimmer h-4 rounded" style={{ width: `${w}%` }} />
                  ))}
                </div>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {task.description}
                  </p>

                  {!asking && !task.execute && !executeLoading && (
                    <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/[0.06] p-3">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-cyan-300/80">
                        &ldquo;Do it for me&rdquo; will
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-200">
                        {task.copilot.summary}
                      </p>
                    </div>
                  )}

                  {/* the change result */}
                  {executeLoading && !task.execute ? (
                    <div className="space-y-2 rounded-xl border border-cyan-400/25 bg-cyan-500/[0.05] p-4">
                      <div className="flex items-center gap-2 text-sm text-cyan-200">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Making the change…
                      </div>
                      {[70, 90, 55].map((w, i) => (
                        <div key={i} className="shimmer h-3 rounded" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                  ) : task.execute ? (
                    <ChangeResult taskId={task.id} />
                  ) : null}

                  {/* ask before running */}
                  {asking && (
                    <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/[0.06] p-4">
                      <p className="text-sm font-medium text-white">
                        Claude will: {task.copilot.summary}
                      </p>

                      <label className="mt-3 block text-xs text-slate-400">
                        Want to keep or change anything?{" "}
                        <span className="text-slate-600">(optional)</span>
                      </label>
                      <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. keep the sign-up screen, use Postgres…"
                        className="mt-1 h-10 w-full rounded-lg border border-white/12 bg-white/[0.03] px-3 text-xs text-slate-100 outline-none focus:border-cyan-400/50"
                      />

                      <button
                        onClick={() => setAdvanced((v) => !v)}
                        className="mt-2 flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300"
                      >
                        <ChevronDown
                          className={cn("h-3 w-3 transition-transform", advanced && "rotate-180")}
                        />
                        {advanced ? "Hide the detailed plan" : "Edit the detailed plan"}
                      </button>
                      {advanced && (
                        <textarea
                          value={executeInstructions}
                          onChange={(e) => setExecuteInstructions(e.target.value)}
                          rows={8}
                          className="mt-2 w-full resize-y rounded-lg border border-white/12 bg-black/30 p-2.5 font-mono text-[11px] leading-relaxed text-slate-100 outline-none focus:border-cyan-400/50"
                        />
                      )}

                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={run}
                          className="bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400"
                        >
                          <Wand2 className="h-3.5 w-3.5" />
                          Do it
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelExecute}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* the step-by-step (advice) — collapsed, secondary */}
                  <div className="rounded-lg border border-white/10 bg-white/[0.02]">
                    <button
                      onClick={() => setShowPlan((v) => !v)}
                      className="flex w-full items-center justify-between p-3 text-xs text-slate-400 hover:text-white"
                    >
                      Rather do it yourself? See the steps
                      <ChevronDown
                        className={cn("h-3.5 w-3.5 transition-transform", showPlan && "rotate-180")}
                      />
                    </button>
                    {showPlan && (
                      <div className="space-y-2.5 border-t border-white/10 p-3">
                        {task.copilot.steps.map((step, i) => (
                          <div key={i}>
                            <p className="text-xs font-medium text-slate-100">
                              {i + 1}. {step.title}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                              {step.detail}
                            </p>
                          </div>
                        ))}
                        {task.copilot.manual && (
                          <p className="whitespace-pre-wrap rounded-lg border border-white/10 bg-white/[0.02] p-2.5 font-mono text-[11px] leading-relaxed text-slate-300">
                            {task.copilot.manual}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <footer className="space-y-2 border-t border-white/10 p-5">
              {!asking && !task.execute && !executeLoading && (
                <>
                  <Button
                    className="w-full bg-gradient-to-r from-cyan-500 to-sky-500 shadow-[0_0_24px_-6px_rgb(34_211_238/0.85)] hover:from-cyan-400 hover:to-sky-400"
                    onClick={() => startExecute(task.id)}
                  >
                    <Wand2 className="h-4 w-4" />
                    {plan === "pro" ? "Do it for me" : "Do it for me · $19/mo"}
                  </Button>
                  {plan === "pro" && (
                    <p className="text-center text-[11px] text-slate-600">
                      {Math.max(0, EXECUTE_LIMIT - executesUsed)} left this month
                    </p>
                  )}
                </>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    if (!task.done) toggleTask(task.id);
                    close();
                  }}
                >
                  <Check className="h-4 w-4" />
                  {task.done ? "Done" : "Mark done"}
                </Button>
                <Button variant="ghost" onClick={close}>
                  Close
                </Button>
              </div>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
