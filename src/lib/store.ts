"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { analyzeGithub, analyzeZip, IngestError } from "./ingest";
import { mockAnalysis, mockBrief, mockChecklist, mockCopilot, mockExecute } from "./mock";
import { decodeSharePlan } from "./report";
import { clamp, slugify } from "./utils";
import type {
  AnalysisResult,
  Answers,
  AppBrief,
  ChecklistResult,
  ChecklistTask,
  Plan,
  ProjectMeta,
  PullRequestRef,
  SavedProject,
  Severity,
  Stage,
} from "./types";

export const FREE_TASKS = 3;
export const FREE_SCANS = 1;
export const MAX_SAVED_PROJECTS = 12;

/** One flat plan. Monthly so recurring revenue covers recurring compute. */
export const PRO_PRICE = 39;
/** Hard fair-use cap on "make the change" runs so a subscriber can't outrun the price. */
export const EXECUTE_LIMIT = 30;

export type UnlockReason = "scan" | "tasks" | "export" | "execute";

export interface IngestErrorInfo {
  title: string;
  steps: string[];
  fix: "url" | "zip" | "retry" | "none";
}

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 3,
  high: 2,
  medium: 1.3,
  low: 1,
};

export function computeReadiness(tasks: ChecklistTask[], base: number) {
  if (!tasks.length) return base;
  const total = tasks.reduce((s, t) => s + SEVERITY_WEIGHT[t.severity], 0);
  const done = tasks
    .filter((t) => t.done)
    .reduce((s, t) => s + SEVERITY_WEIGHT[t.severity], 0);
  if (done >= total) return 100;
  return clamp(Math.round(base + (100 - base) * (done / total)), base, 100);
}

export function allows(
  plan: Plan,
  sharedView: boolean,
  need: "tasks" | "export" | "execute",
): boolean {
  return plan === "pro" || (need !== "execute" && sharedView);
}

export function taskLocked(
  checklist: ChecklistResult | null,
  taskId: string,
  plan: Plan,
  sharedView: boolean,
): boolean {
  if (allows(plan, sharedView, "tasks") || !checklist) return false;
  return checklist.tasks.findIndex((t) => t.id === taskId) >= FREE_TASKS;
}

function projectId(meta: ProjectMeta) {
  return (
    slugify(meta.githubUrl || `${meta.name}-${meta.source}`) ||
    `p-${Date.now().toString(36)}`
  );
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface FlowState {
  hydrated: boolean;

  stage: Stage;
  error: string | null;
  ingestError: IngestErrorInfo | null;
  ingesting: boolean;

  builtPercent: number;
  scansUsed: number;
  executesUsed: number;
  githubToken: string | null;

  meta: ProjectMeta | null;
  analysis: AnalysisResult | null;

  answers: Answers;
  brief: AppBrief | null;
  briefLoading: boolean;

  checklist: ChecklistResult | null;
  sharedView: boolean;

  projects: SavedProject[];
  activeProjectId: string | null;

  plan: Plan;
  unlockOpen: boolean;
  unlockReason: UnlockReason;

  copilotTaskId: string | null;
  copilotLoading: boolean;

  executeAsk: string | null;
  executeInstructions: string;
  executeLoading: boolean;
  applyBusy: boolean;
  appliedTaskId: string | null;
  prByTask: Record<string, PullRequestRef>;
  prBusy: string | null;
  prError: string | null;

  setHydrated: () => void;
  startZip: (file: File) => Promise<void>;
  startGithub: (url: string) => Promise<void>;
  clearIngestError: () => void;
  setAnswer: (id: string, value: string) => void;
  requestBrief: () => Promise<void>;
  confirmBrief: (edited: Partial<AppBrief>) => Promise<void>;
  toggleTask: (id: string) => void;
  dismissTask: (id: string) => void;
  openCopilot: (taskId: string) => Promise<void>;
  closeCopilot: () => void;
  startExecute: (taskId: string) => void;
  setExecuteInstructions: (v: string) => void;
  runExecute: (verifySteps: boolean) => Promise<void>;
  cancelExecute: () => void;
  discardExecute: (taskId: string) => void;
  applyExecute: () => Promise<void>;
  setGithubToken: (t: string) => void;
  openPullRequest: (taskId: string) => Promise<void>;
  resumeProject: (id: string) => void;
  deleteProject: (id: string) => void;
  openUnlock: (reason?: UnlockReason) => void;
  closeUnlock: () => void;
  completePurchase: () => void;
  loadSharedPlan: (raw: string) => boolean;
  reset: () => void;
}

const initial = {
  hydrated: false,
  stage: "idle" as Stage,
  error: null,
  ingestError: null as IngestErrorInfo | null,
  ingesting: false,
  builtPercent: 80,
  scansUsed: 0,
  executesUsed: 0,
  githubToken: null as string | null,
  meta: null,
  analysis: null,
  answers: {} as Answers,
  brief: null as AppBrief | null,
  briefLoading: false,
  checklist: null,
  sharedView: false,
  projects: [] as SavedProject[],
  activeProjectId: null as string | null,
  plan: "free" as Plan,
  unlockOpen: false,
  unlockReason: "tasks" as UnlockReason,
  copilotTaskId: null,
  copilotLoading: false,
  executeAsk: null,
  executeInstructions: "",
  executeLoading: false,
  applyBusy: false,
  appliedTaskId: null,
  prByTask: {} as Record<string, PullRequestRef>,
  prBusy: null,
  prError: null,
};

export const useFlow = create<FlowState>()(
  persist(
    (set, get) => {
      /** Upsert the active project into the saved list (slim copy). */
      function saveActive() {
        const s = get();
        if (!s.meta || !s.checklist || s.sharedView) return;
        const id = s.activeProjectId ?? projectId(s.meta);
        const readiness = computeReadiness(
          s.checklist.tasks,
          s.checklist.launchReadiness,
        );
        const entry: SavedProject = {
          id,
          name: s.meta.name,
          detectedType: s.meta.detectedType,
          platform: s.meta.platform,
          source: s.meta.source,
          updatedAt: Date.now(),
          readiness,
          doneCount: s.checklist.tasks.filter((t) => t.done).length,
          taskCount: s.checklist.tasks.length,
          meta: s.meta,
          brief: s.brief,
          answers: s.answers,
          builtPercent: s.builtPercent,
          checklist: {
            ...s.checklist,
            tasks: s.checklist.tasks.map(
              ({ copilot: _c, execute: _e, ...t }) => t,
            ),
          },
        };
        set({
          activeProjectId: id,
          projects: [entry, ...s.projects.filter((p) => p.id !== id)].slice(
            0,
            MAX_SAVED_PROJECTS,
          ),
        });
      }

      function scanBlocked() {
        const s = get();
        if (s.plan === "free" && s.scansUsed >= FREE_SCANS) {
          set({ unlockOpen: true, unlockReason: "scan", ingesting: false });
          return true;
        }
        return false;
      }

      async function beginScan(rawMeta: ProjectMeta) {
        const meta = { ...rawMeta, builtPercent: get().builtPercent };
        set({
          meta,
          analysis: null,
          answers: {},
          brief: null,
          checklist: null,
          sharedView: false,
          activeProjectId: null,
          stage: "scanning",
          ingesting: false,
          error: null,
          ingestError: null,
        });

        const startedAt = Date.now();
        let analysis: AnalysisResult;
        try {
          analysis = await postJson<AnalysisResult>("/api/analyze", { meta });
        } catch {
          analysis = {
            ...mockAnalysis(meta),
            source: "mock" as const,
            mockReason: "error" as const,
          };
        }
        await sleep(Math.max(0, 550 - (Date.now() - startedAt)));
        set((s) => ({
          analysis,
          stage: "questions",
          scansUsed: s.scansUsed + 1,
        }));
      }

      function handleIngestError(e: unknown, fallback: IngestErrorInfo) {
        if (e instanceof IngestError) {
          set({
            ingesting: false,
            error: e.title,
            ingestError: { title: e.title, steps: e.steps, fix: e.fix },
          });
        } else {
          set({ ingesting: false, error: fallback.title, ingestError: fallback });
        }
      }

      return {
        ...initial,

        setHydrated: () => set({ hydrated: true }),

        async startZip(file) {
          if (scanBlocked()) return;
          if (!/\.zip$/i.test(file.name)) {
            set({
              ingestError: {
                title: "That's not a .zip file.",
                steps: [
                  "FinalStretch reads .zip archives.",
                  "Right-click your project folder → Compress / Send to → ZIP, then drop the .zip here.",
                ],
                fix: "zip",
              },
              error: "That's not a .zip file.",
            });
            return;
          }
          set({ ingesting: true, error: null, ingestError: null });
          try {
            await beginScan(await analyzeZip(file));
          } catch (e) {
            handleIngestError(e, {
              title: "Couldn't read that archive.",
              steps: ["Try re-zipping the project folder and dropping it again."],
              fix: "zip",
            });
          }
        },

        async startGithub(url) {
          if (scanBlocked()) return;
          set({ ingesting: true, error: null, ingestError: null });
          try {
            await beginScan(await analyzeGithub(url));
          } catch (e) {
            handleIngestError(e, {
              title: "Couldn't reach that repository.",
              steps: [
                "Check the URL and your connection.",
                "Or download the repo as a ZIP and drop it here instead.",
              ],
              fix: "zip",
            });
          }
        },

        clearIngestError() {
          set({ ingestError: null, error: null });
        },

        setAnswer(id, value) {
          set((s) => ({ answers: { ...s.answers, [id]: value } }));
        },

        async requestBrief() {
          const { meta, answers } = get();
          if (!meta) return;
          set({ stage: "brief", briefLoading: true, brief: null, error: null });
          let brief: AppBrief;
          try {
            brief = await postJson<AppBrief>("/api/brief", { meta, answers });
          } catch {
            brief = { ...mockBrief(meta, answers), source: "mock" };
          }
          set({ brief, briefLoading: false });
        },

        async confirmBrief(edited) {
          const { meta, answers, brief } = get();
          if (!meta) return;
          const finalBrief: AppBrief = {
            ...(brief ?? mockBrief(meta, answers)),
            ...edited,
          };
          set({ brief: finalBrief, stage: "generating", error: null });
          try {
            const checklist = await postJson<ChecklistResult>("/api/checklist", {
              meta,
              answers,
              brief: finalBrief,
            });
            set({ checklist, stage: "dashboard" });
          } catch {
            set({
              checklist: mockChecklist(meta, answers, finalBrief),
              stage: "dashboard",
            });
          }
          saveActive();
        },

        toggleTask(id) {
          const s = get();
          if (taskLocked(s.checklist, id, s.plan, s.sharedView)) {
            set({ unlockOpen: true, unlockReason: "tasks" });
            return;
          }
          if (!s.checklist) return;
          set({
            checklist: {
              ...s.checklist,
              tasks: s.checklist.tasks.map((t) =>
                t.id === id ? { ...t, done: !t.done } : t,
              ),
            },
          });
          saveActive();
        },

        dismissTask(id) {
          const s = get();
          if (!s.checklist) return;
          if (taskLocked(s.checklist, id, s.plan, s.sharedView)) {
            set({ unlockOpen: true, unlockReason: "tasks" });
            return;
          }
          set({
            checklist: {
              ...s.checklist,
              tasks: s.checklist.tasks.filter((t) => t.id !== id),
            },
            copilotTaskId: s.copilotTaskId === id ? null : s.copilotTaskId,
          });
          saveActive();
        },

        async openCopilot(taskId) {
          const s0 = get();
          const task = s0.checklist?.tasks.find((t) => t.id === taskId);
          if (!task || !s0.meta) return;
          if (taskLocked(s0.checklist, taskId, s0.plan, s0.sharedView)) {
            set({ unlockOpen: true, unlockReason: "tasks" });
            return;
          }
          set({ copilotTaskId: taskId });
          if (task.copilot) return;
          set({ copilotLoading: true });
          let payload;
          try {
            payload = await postJson("/api/copilot", {
              task,
              meta: s0.meta,
              brief: s0.brief,
            });
          } catch {
            payload = mockCopilot(task);
          }
          set((s) =>
            s.checklist
              ? {
                  copilotLoading: false,
                  checklist: {
                    ...s.checklist,
                    tasks: s.checklist.tasks.map((t) =>
                      t.id === taskId
                        ? { ...t, copilot: payload as ChecklistTask["copilot"] }
                        : t,
                    ),
                  },
                }
              : { copilotLoading: false },
          );
        },

        closeCopilot() {
          set({ copilotTaskId: null, executeAsk: null });
        },

        startExecute(taskId) {
          const s = get();
          if (s.plan !== "pro") {
            set({ unlockOpen: true, unlockReason: "execute" });
            return;
          }
          if (s.executesUsed >= EXECUTE_LIMIT) {
            set({
              error: `You've used your ${EXECUTE_LIMIT} changes this cycle — they reset on renewal.`,
            });
            return;
          }
          const task = s.checklist?.tasks.find((t) => t.id === taskId);
          const seed = task?.copilot
            ? [
                task.copilot.summary,
                ...task.copilot.steps.map((x) => `- ${x.title}: ${x.detail}`),
              ].join("\n")
            : task?.description ?? "";
          set({ executeAsk: taskId, executeInstructions: seed, prError: null });
        },

        setExecuteInstructions(v) {
          set({ executeInstructions: v });
        },

        cancelExecute() {
          set({ executeAsk: null });
        },

        async runExecute(verifySteps) {
          const taskId = get().executeAsk;
          const { checklist, meta, brief, executeInstructions } = get();
          const task = checklist?.tasks.find((t) => t.id === taskId);
          if (!task || !meta) {
            set({ executeAsk: null });
            return;
          }
          set({ executeAsk: null, executeLoading: true, appliedTaskId: null });
          let result;
          try {
            const { gatherFileContents } = await import("./file-contents");
            const files = await gatherFileContents(meta).catch(() => []);
            result = await postJson("/api/execute", {
              task,
              meta,
              brief,
              files,
              instructions: executeInstructions,
              verifySteps,
            });
          } catch {
            result = mockExecute(task, meta);
          }
          set((s) => ({
            executeLoading: false,
            executesUsed:
              (result as { source?: string })?.source === "ai"
                ? s.executesUsed + 1
                : s.executesUsed,
            checklist: s.checklist
              ? {
                  ...s.checklist,
                  tasks: s.checklist.tasks.map((t) =>
                    t.id === taskId
                      ? { ...t, execute: result as ChecklistTask["execute"] }
                      : t,
                  ),
                }
              : s.checklist,
          }));
          saveActive();
        },

        discardExecute(taskId) {
          set((s) => ({
            appliedTaskId: s.appliedTaskId === taskId ? null : s.appliedTaskId,
            prByTask: Object.fromEntries(
              Object.entries(s.prByTask).filter(([k]) => k !== taskId),
            ),
            checklist: s.checklist
              ? {
                  ...s.checklist,
                  tasks: s.checklist.tasks.map((t) =>
                    t.id === taskId ? { ...t, execute: undefined, done: false } : t,
                  ),
                }
              : s.checklist,
          }));
          saveActive();
        },

        async applyExecute() {
          const { checklist, meta, copilotTaskId } = get();
          const task = checklist?.tasks.find((t) => t.id === copilotTaskId);
          if (!task?.execute || !meta) return;
          set({ applyBusy: true });
          try {
            const { buildPatchedArchive } = await import("./apply-changes");
            const { blob, filename } = await buildPatchedArchive(
              meta,
              task.execute.files,
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            set({ applyBusy: false, appliedTaskId: task.id });
            if (!task.done) get().toggleTask(task.id);
          } catch {
            set({ applyBusy: false });
          }
        },

        setGithubToken(t) {
          set({ githubToken: t.trim() || null });
        },

        async openPullRequest(taskId) {
          const { checklist, meta, githubToken, brief } = get();
          const task = checklist?.tasks.find((t) => t.id === taskId);
          if (!task?.execute || !meta || meta.source !== "github" || !githubToken)
            return;
          set({ prBusy: taskId, prError: null });
          try {
            const pr = await postJson<PullRequestRef>("/api/github-pr", {
              githubUrl: meta.githubUrl,
              token: githubToken,
              files: task.execute.files,
              title: `FinalStretch: ${task.title}`,
              body:
                `${task.execute.summary}\n\n` +
                (brief?.goal ? `Goal: ${brief.goal}\n\n` : "") +
                `Opened by FinalStretch. Review, then merge or close.`,
            });
            set((s) => ({
              prBusy: null,
              prByTask: { ...s.prByTask, [taskId]: pr },
            }));
            if (!task.done) get().toggleTask(task.id);
          } catch (e) {
            set({
              prBusy: null,
              prError:
                e instanceof Error
                  ? `Couldn't open the PR (${e.message}). Check the token has Contents + Pull requests write on this repo.`
                  : "Couldn't open the PR.",
            });
          }
        },

        resumeProject(id) {
          const p = get().projects.find((x) => x.id === id);
          if (!p) return;
          set({
            meta: p.meta,
            brief: p.brief,
            answers: p.answers,
            builtPercent: p.builtPercent,
            checklist: p.checklist,
            analysis: null,
            stage: "dashboard",
            sharedView: false,
            activeProjectId: id,
            unlockOpen: false,
            error: null,
            ingestError: null,
            copilotTaskId: null,
          });
        },

        deleteProject(id) {
          set((s) => ({
            projects: s.projects.filter((p) => p.id !== id),
            activeProjectId:
              s.activeProjectId === id ? null : s.activeProjectId,
          }));
        },

        openUnlock(reason = "tasks") {
          set({ unlockOpen: true, unlockReason: reason });
        },
        closeUnlock() {
          set({ unlockOpen: false });
        },
        completePurchase() {
          set({ plan: "pro", unlockOpen: false });
        },

        loadSharedPlan(raw) {
          const parsed = decodeSharePlan(raw);
          if (!parsed) return false;
          set({
            meta: parsed.meta,
            checklist: parsed.checklist,
            builtPercent: parsed.builtPercent ?? 80,
            analysis: null,
            answers: {},
            brief: null,
            stage: "dashboard",
            sharedView: true,
            hydrated: true,
            error: null,
            ingestError: null,
          });
          return true;
        },

        reset() {
          set({
            ...initial,
            hydrated: true,
            builtPercent: get().builtPercent,
            plan: get().plan,
            scansUsed: get().scansUsed,
            executesUsed: get().executesUsed,
            githubToken: get().githubToken,
            projects: get().projects,
          });
        },
      };
    },
    {
      name: "finishline-flow-v1",
      version: 4,
      skipHydration: true,
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : (undefined as unknown as Storage),
      ),
      partialize: (s) => ({
        stage: s.stage,
        builtPercent: s.builtPercent,
        scansUsed: s.scansUsed,
        executesUsed: s.executesUsed,
        githubToken: s.githubToken,
        meta: s.meta,
        analysis: s.analysis,
        answers: s.answers,
        brief: s.brief,
        checklist: s.checklist,
        plan: s.plan,
        prByTask: s.prByTask,
        projects: s.projects,
        activeProjectId: s.activeProjectId,
      }),
      // The schema has only grown across versions; merge() below does all the
      // normalization, so this just needs to hand the stored blob through.
      migrate: (persisted) => persisted as FlowState,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<FlowState> & { paid?: boolean };
        let stage: Stage = p.stage ?? "idle";
        if (stage === "scanning" || stage === "generating") {
          stage = p.checklist ? "dashboard" : p.analysis ? "questions" : "idle";
        }
        if (stage === "brief" && !p.brief) {
          stage = p.checklist ? "dashboard" : "questions";
        }
        const rawPlan = p.plan ?? (p.paid ? "pro" : "free");
        const plan: Plan = rawPlan === "free" ? "free" : "pro"; // "project" → "pro"
        return {
          ...current,
          ...p,
          plan,
          stage,
          projects: p.projects ?? [],
          prByTask: p.prByTask ?? {},
          unlockOpen: false,
          briefLoading: false,
          copilotTaskId: null,
          copilotLoading: false,
          executeAsk: null,
          executeInstructions: "",
          executeLoading: false,
          applyBusy: false,
          appliedTaskId: null,
          prBusy: null,
          prError: null,
          ingesting: false,
          error: null,
          ingestError: null,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as unknown as { __flow?: typeof useFlow }).__flow = useFlow;
}
