import { clamp, slugify } from "./utils";
import { TASK_CATEGORIES } from "./types";
import type {
  AnalysisResult,
  AppBrief,
  ChecklistResult,
  ChecklistTask,
  ClarifyingQuestion,
  CopilotPayload,
  ExecuteFile,
  ExecuteResult,
  Severity,
  TaskCategory,
} from "./types";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function normalizeAnalysis(raw: unknown): AnalysisResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const questions: ClarifyingQuestion[] = arr(r.questions)
    .slice(0, 4)
    .map((q, i) => {
      const qo = (q ?? {}) as Record<string, unknown>;
      const options = arr(qo.options).map((o) => str(o)).filter(Boolean).slice(0, 4);
      return {
        id: str(qo.id) || `q${i + 1}`,
        question: str(qo.question, "Tell me more about your target."),
        hint: str(qo.hint) || undefined,
        options: options.length >= 2 ? options : ["Yes", "No", "Not sure"],
        allowCustom: Boolean(qo.allowCustom),
      };
    });
  if (questions.length < 2) throw new Error("analysis: not enough questions");
  return {
    summary: str(r.summary, "Scan complete — a few questions before I build the plan."),
    readiness: clamp(Math.round(Number(r.readiness) || 55), 5, 95),
    questions,
  };
}

export function normalizeBrief(raw: unknown): AppBrief {
  const r = (raw ?? {}) as Record<string, unknown>;
  const description = str(r.description);
  if (!description) throw new Error("brief: no description");
  return {
    description,
    goal: str(r.goal, "Get it live and in front of real users."),
    audience: str(r.audience, "Its intended users."),
    plan: str(r.plan) || undefined,
    unsure: Boolean(r.unsure),
  };
}

export function normalizeExecute(raw: unknown): ExecuteResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const files: ExecuteFile[] = arr(r.files)
    .map((f) => {
      const fo = (f ?? {}) as Record<string, unknown>;
      const action = ["create", "modify", "delete"].includes(fo.action as string)
        ? (fo.action as ExecuteFile["action"])
        : "modify";
      return { path: str(fo.path), action, contents: str(fo.contents) };
    })
    .filter((f) => f.path)
    .slice(0, 12);
  const commands = arr(r.commands).map((c) => str(c)).filter(Boolean).slice(0, 12);
  const summary = str(r.summary);
  const runLocally = str(r.runLocally);
  if (!summary && !files.length && !runLocally)
    throw new Error("execute: empty payload");
  return {
    summary: summary || "Change set ready to apply.",
    files,
    commands,
    runLocally: runLocally || "Run your dev server and check the change.",
  };
}

function normalizeCopilotShape(raw: unknown): CopilotPayload | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const steps = arr(r.steps)
    .map((s) => {
      const so = (s ?? {}) as Record<string, unknown>;
      const detail = str(so.detail);
      const plain = str(so.plain);
      return { title: str(so.title), plain: plain || detail, detail: detail || plain };
    })
    .filter((s) => s.title || s.detail)
    .slice(0, 6);
  const summary = str(r.summary);
  const plainSummary = str(r.plainSummary);
  if (!summary && !steps.length) return undefined;
  return {
    summary: summary || plainSummary || "Here's the fix.",
    plainSummary: plainSummary || summary || undefined,
    steps: steps.length
      ? steps
      : [{ title: "Do it", plain: plainSummary || summary, detail: summary }],
    codeDiff: str(r.codeDiff) || undefined,
    language: str(r.language) || undefined,
    manual: str(r.manual) || undefined,
  };
}

export function normalizeCopilot(raw: unknown): CopilotPayload {
  const shaped = normalizeCopilotShape(raw);
  if (!shaped) throw new Error("copilot: empty payload");
  return shaped;
}

export function normalizeChecklist(raw: unknown): ChecklistResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const seen = new Set<string>();
  const tasks: ChecklistTask[] = arr(r.tasks)
    .map((t, i) => {
      const to = (t ?? {}) as Record<string, unknown>;
      const category = (TASK_CATEGORIES.includes(to.category as TaskCategory)
        ? to.category
        : "Critical Code Fixes") as TaskCategory;
      const severity = (SEVERITIES.includes(to.severity as Severity)
        ? to.severity
        : "medium") as Severity;
      let id = slugify(str(to.id) || str(to.title) || `task-${i + 1}`) || `task-${i + 1}`;
      while (seen.has(id)) id = `${id}-${i}`;
      seen.add(id);
      return {
        id,
        title: str(to.title, `Task ${i + 1}`),
        description: str(to.description, ""),
        category,
        severity,
        estMinutes: clamp(Math.round(Number(to.estMinutes) || 45), 5, 480),
        done: false,
        copilot: normalizeCopilotShape(to.copilot),
      };
    })
    .filter((t) => t.title);
  if (tasks.length < 4) throw new Error("checklist: too few tasks");
  return {
    projectSummary: str(r.projectSummary, "Your prioritized path to launch."),
    launchReadiness: clamp(Math.round(Number(r.launchReadiness) || 55), 8, 90),
    tasks,
  };
}
