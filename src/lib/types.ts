export type Stage =
  | "idle"
  | "scanning"
  | "questions"
  | "brief"
  | "generating"
  | "dashboard";

export type ProjectSource = "zip" | "github";

export interface ProjectMeta {
  name: string;
  source: ProjectSource;
  githubUrl?: string;
  fileCount: number;
  fileTree: string[];
  detectedType: string;
  /** Coarse platform bucket used to inject compliance tasks. */
  platform: Platform;
  detectedStack: string[];
  languages: string[];
  packageManagers: string[];
  notes: string[];
  /** The user's own "how done am I" estimate from the homepage slider (50–90). */
  builtPercent?: number;
}

export type Platform = "ios" | "android" | "web" | "desktop" | "game" | "python" | "cli";

export type Plan = "free" | "pro";

export type TaskCategory =
  | "Critical Code Fixes"
  | "Deployment & Compliance"
  | "Product & Growth"
  | "Marketing & Assets";

export const TASK_CATEGORIES: TaskCategory[] = [
  "Critical Code Fixes",
  "Deployment & Compliance",
  "Product & Growth",
  "Marketing & Assets",
];

export type Severity = "critical" | "high" | "medium" | "low";

export interface CopilotStep {
  title: string;
  detail: string;
}

export interface CopilotPayload {
  summary: string;
  steps: CopilotStep[];
  codeDiff?: string;
  language?: string;
  manual?: string;
}

export interface ChecklistTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  severity: Severity;
  estMinutes: number;
  done: boolean;
  copilot?: CopilotPayload;
  /** Populated when the user runs Execute (Pro) on this task. */
  execute?: ExecuteResult;
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  hint?: string;
  options: string[];
  allowCustom?: boolean;
}

export interface AnalysisResult {
  summary: string;
  readiness: number;
  questions: ClarifyingQuestion[];
  /** "ai" = tailored by Claude, "mock" = offline/demo fallback. */
  source?: "ai" | "mock";
  mockReason?: "no-key" | "error";
}

/** The AI's read on what the app is and what the user is actually trying to do. */
export interface AppBrief {
  description: string;
  goal: string;
  audience: string;
  source?: "ai" | "mock";
}

export interface ChecklistResult {
  projectSummary: string;
  launchReadiness: number;
  tasks: ChecklistTask[];
}

export interface ExecuteFile {
  path: string;
  action: "create" | "modify" | "delete";
  contents: string;
}

export interface ExecuteResult {
  summary: string;
  files: ExecuteFile[];
  commands: string[];
  runLocally: string;
  source?: "ai" | "mock";
  note?: string;
}

export interface PullRequestRef {
  url: string;
  number: number;
  branch: string;
}

export interface SavedProject {
  id: string;
  name: string;
  detectedType: string;
  platform: Platform;
  source: ProjectSource;
  updatedAt: number;
  readiness: number;
  doneCount: number;
  taskCount: number;
  meta: ProjectMeta;
  brief: AppBrief | null;
  answers: Answers;
  builtPercent: number;
  /** Slimmed — copilot/execute payloads stripped to keep localStorage small. */
  checklist: ChecklistResult;
}

export type Answers = Record<string, string>;
