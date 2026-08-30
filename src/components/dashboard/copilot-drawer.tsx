"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  FileCode2,
  GitPullRequest,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  TriangleAlert,
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

function CodeBlock({
  code,
  label,
  diff = false,
}: {
  code: string;
  label: string;
  diff?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="truncate font-mono text-[11px] uppercase tracking-widest text-slate-500">
          {label}
        </span>
        <CopyBtn text={code} />
      </div>
      <pre className="max-h-72 overflow-auto p-3 font-mono text-xs leading-relaxed text-slate-200">
        {diff
          ? code.split("\n").map((line, i) => (
              <div
                key={i}
                className={cn(
                  "px-1",
                  line.startsWith("+") && !line.startsWith("+++") && "diff-add",
                  line.startsWith("-") && !line.startsWith("---") && "diff-del",
                  (line.startsWith("@@") ||
                    line.startsWith("+++") ||
                    line.startsWith("---")) &&
                    "diff-meta",
                )}
              >
                {line || " "}
              </div>
            ))
          : code}
      </pre>
    </div>
  );
}

function ExecutePanel({ taskId }: { taskId: string }) {
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

  const [tokenDraft, setTokenDraft] = useState("");
  const [showGit, setShowGit] = useState(false);
  const result = task?.execute;
  if (!result || !meta) return null;

  const isGithub = meta.source === "github";
  const isMock = result.source === "mock";

  return (
    <div className="space-y-3 rounded-lg border border-cyan-400/25 bg-cyan-500/[0.05] p-3">
      <div className="flex items-center justify-between text-cyan-300">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em]">
          <Play className="h-3.5 w-3.5" />
          {isMock ? "couldn't build" : `changed ${result.files.length} file${result.files.length === 1 ? "" : "s"}`}
        </span>
        <button
          onClick={() => discardExecute(taskId)}
          className="flex items-center gap-1 text-[11px] text-slate-400 transition-colors hover:text-rose-300"
        >
          <RotateCcw className="h-3 w-3" />
          Undo
        </button>
      </div>

      <p className="text-sm leading-relaxed text-slate-200">{result.summary}</p>

      {result.note && (
        <p className="flex items-start gap-1.5 rounded-md border border-amber-400/25 bg-amber-500/10 p-2 text-xs text-amber-200">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {result.note}
        </p>
      )}

      {!isMock && (
        <>
          <button
            onClick={() => void applyExecute()}
            disabled={applyBusy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 text-sm font-semibold text-white shadow-[0_0_22px_-6px_rgb(34_211_238/0.85)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
          >
            {applyBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Building your project…
              </>
            ) : applied ? (
              <>
                <Check className="h-4 w-4" /> Downloaded — download again
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> Apply &amp; download my project
              </>
            )}
          </button>

          {isGithub && !githubToken && (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <p className="text-xs font-medium text-white">
                Or open a Pull Request on your repo
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Paste a GitHub{" "}
                <a
                  href="https://github.com/settings/tokens?type=beta"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-slate-300"
                >
                  fine-grained token
                </a>{" "}
                with <span className="text-slate-400">Contents</span> +{" "}
                <span className="text-slate-400">Pull requests</span> write on this
                repo. Stored only in your browser.
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  type="password"
                  value={tokenDraft}
                  onChange={(e) => setTokenDraft(e.target.value)}
                  placeholder="github_pat_…"
                  className="h-9 flex-1 rounded-lg border border-white/12 bg-white/[0.03] px-2.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/50"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setGithubToken(tokenDraft)}
                >
                  Save
                </Button>
              </div>
            </div>
          )}

          {isGithub && githubToken && !pr && (
            <button
              onClick={() => void openPullRequest(taskId)}
              disabled={prBusy}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] text-sm font-medium text-slate-100 transition-colors hover:border-cyan-400/40 disabled:opacity-60"
            >
              {prBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Opening PR…
                </>
              ) : (
                <>
                  <GitPullRequest className="h-4 w-4" /> Open a Pull Request
                </>
              )}
            </button>
          )}

          {pr && (
            <a
              href={pr.url}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-500/20"
            >
              <GitPullRequest className="h-4 w-4" />
              PR #{pr.number} opened — review on GitHub
            </a>
          )}
          {prError && <p className="text-[11px] text-rose-300">{prError}</p>}

          <p className="text-[11px] leading-relaxed text-slate-500">
            FinalStretch can&apos;t run your project — download the patched copy and
            open it in your editor, or review the PR on GitHub. (It works like a
            Claude Code change, minus running it here.)
          </p>

          {meta.source === "zip" && (
            <div className="rounded-lg border border-white/10 bg-white/[0.02]">
              <button
                onClick={() => setShowGit((v) => !v)}
                className="flex w-full items-center justify-between p-2.5 text-xs font-medium text-slate-300"
              >
                Want undo + PRs? Put this project in Git
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", showGit && "rotate-180")}
                />
              </button>
              {showGit && (
                <div className="border-t border-white/10 p-2.5">
                  <CodeBlock
                    label="one-time setup"
                    code={[
                      "cd your-project",
                      "git init && git add -A && git commit -m 'baseline'",
                      "# create an empty repo at github.com/new, then:",
                      "git remote add origin https://github.com/you/your-repo.git",
                      "git push -u origin main",
                    ].join("\n")}
                  />
                  <p className="mt-2 text-[11px] text-slate-500">
                    Then re-scan with the GitHub link and FinalStretch can open PRs
                    for every change.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {result.files.map((f) => (
        <div key={f.path}>
          <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
            <FileCode2 className="h-3 w-3" />
            <span className="font-mono">{f.path}</span>
            <span className="rounded bg-white/5 px-1 text-[10px] uppercase">
              {f.action}
            </span>
          </div>
          {f.action !== "delete" && <CodeBlock code={f.contents} label={f.path} />}
        </div>
      ))}

      {result.commands.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
            <Terminal className="h-3 w-3" />
            Then run
          </div>
          <CodeBlock code={result.commands.join("\n")} label="terminal" />
        </div>
      )}

      {result.runLocally && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs leading-relaxed text-slate-300">
          <span className="font-medium text-white">Verify it worked</span>
          <br />
          {result.runLocally}
        </div>
      )}
    </div>
  );
}

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

  const [wantSteps, setWantSteps] = useState(true);
  const [showPlan, setShowPlan] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const asking = executeAsk === taskId;

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
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col border-l border-violet-400/20 bg-obsidian-soft shadow-[-20px_0_60px_-20px_rgb(139_92_246/0.5)]"
          >
            <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
              <div>
                <div className="flex items-center gap-2 text-violet-300">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-mono text-xs uppercase tracking-[0.2em]">
                    AI co-pilot
                  </span>
                </div>
                <h3 className="mt-1.5 text-base font-semibold tracking-tight text-white">
                  {task.title}
                </h3>
              </div>
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
                  {[80, 95, 70, 88, 60].map((w, i) => (
                    <div key={i} className="shimmer h-4 rounded" style={{ width: `${w}%` }} />
                  ))}
                </div>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {task.description}
                  </p>

                  {/* the plan — secondary, collapsible */}
                  <div className="rounded-lg border border-white/10 bg-white/[0.02]">
                    <button
                      onClick={() => setShowPlan((v) => !v)}
                      className="flex w-full items-center justify-between p-3 text-xs font-medium text-slate-300"
                    >
                      The plan ({task.copilot.steps.length} steps)
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform",
                          showPlan && "rotate-180",
                        )}
                      />
                    </button>
                    {showPlan && (
                      <div className="space-y-3 border-t border-white/10 p-3">
                        <p className="text-sm leading-relaxed text-slate-200">
                          {task.copilot.summary}
                        </p>
                        <ol className="space-y-2.5">
                          {task.copilot.steps.map((step, i) => (
                            <li key={i} className="flex gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 font-mono text-[11px] text-violet-300">
                                {i + 1}
                              </span>
                              <div>
                                <p className="text-xs font-medium text-slate-100">
                                  {step.title}
                                </p>
                                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                                  {step.detail}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ol>
                        {task.copilot.codeDiff && (
                          <CodeBlock
                            code={task.copilot.codeDiff}
                            label={task.copilot.language ?? "diff"}
                            diff
                          />
                        )}
                        {task.copilot.manual && (
                          <p className="whitespace-pre-wrap rounded-lg border border-white/10 bg-white/[0.02] p-3 font-mono text-xs leading-relaxed text-slate-300">
                            {task.copilot.manual}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* execute */}
                  {executeLoading && !task.execute ? (
                    <div className="space-y-2 rounded-lg border border-cyan-400/25 bg-cyan-500/[0.05] p-3">
                      <div className="flex items-center gap-2 text-sm text-cyan-200">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Claude is making the change…
                      </div>
                      {[70, 90, 55].map((w, i) => (
                        <div key={i} className="shimmer h-3 rounded" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                  ) : task.execute ? (
                    <ExecutePanel taskId={task.id} />
                  ) : null}

                  {asking && (
                    <div className="rounded-lg border border-cyan-400/25 bg-cyan-500/[0.06] p-4">
                      <p className="text-sm font-medium text-white">
                        What should Claude change?
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        Prefilled from the plan. Edit it — keep a screen you like,
                        change an approach, add a constraint. Claude follows this
                        exactly, then writes the real files.
                      </p>
                      <textarea
                        value={executeInstructions}
                        onChange={(e) => setExecuteInstructions(e.target.value)}
                        rows={7}
                        className="mt-2 w-full resize-y rounded-lg border border-white/12 bg-black/30 p-2.5 font-mono text-xs leading-relaxed text-slate-100 outline-none focus:border-cyan-400/50"
                      />
                      <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={wantSteps}
                          onChange={(e) => setWantSteps(e.target.checked)}
                          className="accent-cyan-400"
                        />
                        Include steps to run &amp; verify it
                      </label>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => void runExecute(wantSteps)}
                          className="bg-gradient-to-r from-cyan-500 to-sky-500 shadow-[0_0_20px_-6px_rgb(34_211_238/0.8)] hover:from-cyan-400 hover:to-sky-400"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Make the change
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelExecute}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
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
                    <Play className="h-4 w-4" />
                    {plan === "pro"
                      ? "Make this change for me"
                      : "Make this change for me · Pro"}
                  </Button>
                  {plan === "pro" && (
                    <p className="text-center text-[11px] text-slate-600">
                      {Math.max(0, EXECUTE_LIMIT - executesUsed)} changes left this
                      cycle
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
