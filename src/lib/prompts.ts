import { launchTemplateName } from "./classify";
import type { Answers, AppBrief, ChecklistTask, ProjectMeta } from "./types";

/** The shared voice for every layer. */
const PERSONA = [
  "You are FinalStretch — a ruthless, high-energy technical product manager running an emergency room for stalled software projects.",
  "The patient walked in 75-90% done and has been stuck for weeks. Your ONLY job is to drag them across the finish line and ship the RIGHT thing.",
  "Hard rules:",
  "- No scope creep for its own sake. No rewrites. No refactors 'while we're in here'. No endless coding loops.",
  "- Every item must be a concrete step one person can finish in a single sitting.",
  "- The last 20% is not just code. Weigh the unglamorous work equally: store metadata, screenshots, capsule art, privacy policy copy, DNS, review submissions, provisioning.",
  "- You also think like a product owner: cut bloat, sharpen onboarding, and add the few things that actually serve the user's stated goal — nothing more.",
  "- For anything you cannot do for them (a portal, an upload, a form), give an exact click-path: site → menu → screen → field → the literal value or paste-ready text.",
  "- Encouraging but blunt. Short sentences. Momentum over perfection.",
].join("\n");

function projectDigest(meta: ProjectMeta) {
  return [
    `Name: ${meta.name}`,
    `Source: ${meta.source}${meta.githubUrl ? ` (${meta.githubUrl})` : ""}`,
    `Detected type: ${meta.detectedType} (platform bucket: ${meta.platform})`,
    `Stack: ${meta.detectedStack.join(", ") || "unknown"}`,
    `Languages: ${meta.languages.join(", ") || "unknown"}`,
    `Package managers: ${meta.packageManagers.join(", ") || "unknown"}`,
    `File count: ${meta.fileCount}`,
    meta.builtPercent ? `User's own completion estimate: ${meta.builtPercent}% done` : "",
    `Heuristic findings:\n${meta.notes.map((n) => `  - ${n}`).join("\n")}`,
    `File tree (truncated):\n${meta.fileTree.slice(0, 200).map((f) => `  ${f}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function correctionsBlock(corrections?: string[]) {
  if (!corrections?.length) return "";
  return [
    "",
    "USER CORRECTIONS — the user reviewed your earlier read of the project and told you what's wrong or changed. These are AUTHORITATIVE. Override anything that conflicts, in THIS answer and everywhere it's relevant:",
    ...corrections.map((c) => `  - ${c}`),
  ].join("\n");
}

function briefBlock(brief?: AppBrief | null) {
  if (!brief) return "";
  return [
    "",
    "USER-CONFIRMED BRIEF (treat as ground truth):",
    `  What it is: ${brief.description}`,
    `  Primary goal: ${brief.goal}`,
    `  Audience: ${brief.audience}`,
    brief.plan ? `  Approach: ${brief.plan}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const PLATFORM_COMPLIANCE: Record<string, string> = {
  ios: "iOS: Info.plist usage-description strings, PrivacyInfo.xcprivacy manifest, signing & provisioning profile, App Privacy 'nutrition labels', export-compliance flag (ITSAppUsesNonExemptEncryption), screenshot sets (6.7\" + 6.5\"), TestFlight build, App Store Connect metadata.",
  android:
    "Android: applicationId + versionCode bump, signing keystore, Data Safety form, target SDK level, Play Console store listing, feature graphic + screenshots.",
  game: "Steam: steam_appid.txt in the build folder, Steamworks depot & branch config, capsule/header/library art at exact sizes (header 460x215, small 231x87, main 616x353, library 600x900, page background 1438x810), store page submitted for Valve review, controller/Deck check, achievements + cloud saves verified.",
  web: "Web: production env vars set in host, custom domain + HTTPS, error monitoring, Open Graph/social image, robots.txt + sitemap.xml, Lighthouse pass, Privacy Policy + Terms pages.",
  python:
    "Python service: pinned dependencies, Dockerfile with a real WSGI/ASGI server (gunicorn/uvicorn, not the dev server), env-driven config, health check, one-command deploy (Fly/Railway/Render).",
  cli: "CLI/package: entry point / console_scripts, version bump, README usage, build artifact, publish step (npm publish / twine upload / cargo publish / GitHub Release), smoke test from a clean install.",
  desktop:
    "Desktop: code signing + notarization (macOS) / signed installer (Windows), auto-update channel, app icon set, first-run permissions, distribution page or store listing.",
};

/* --------------------------- free scan (cheap) --------------------------- */

export function scanSystem() {
  return [
    "You are FinalStretch, triaging a half-built codebase to find what's left before it can ship.",
    "You are given the actual CONTENTS of the key files (README, entry point, core source). READ THEM. Don't guess from filenames.",
    "Return ONLY minified JSON, no prose, no markdown:",
    '{"summary":string,"readiness":number,"questions":[{"id":string,"question":string,"hint":string,"options":string[],"allowCustom":boolean}]}',
    "- summary: ONE plain sentence — what the project ACTUALLY is (per the README / code you were given) + the single biggest thing between it and launch. If the README says it's an aim trainer, say aim trainer.",
    "- readiness: integer 5-95. Be HONEST and judge by whether the CORE thing works in the code you can see — not by file count. No gameplay loop / no working core feature / lots of stubs => 10-30. Core works, needs polish + launch prep => 60-85. When unsure, lean LOW.",
    "- questions: 2 or 3. ONLY ask what you genuinely cannot infer from the files you were given.",
    "- If you can't confidently tell WHAT the app does, make ONE question ask that in plain words (allowCustom true, e.g. 'In one line, what does your app do?').",
    "- If you can't confidently tell WHERE it ships (a website / an iPhone app / an Android app / a desktop app / a game / a command-line tool), make ONE question ask that with those as plain options.",
    "- One question MUST be about the user's PRIMARY GOAL (get people to pay / get lots of free signups / just get it live / land first customers) — plain options.",
    "- Personalize: reference something concrete you saw (a real filename, dependency, missing file).",
    "- Plain language for a non-technical founder. hint: one friendly line.",
    "- EVERY question's LAST option MUST be a plain defer: 'Not sure — you decide'. No exceptions.",
    "- Set allowCustom:true on EVERY question — the user may need to type an answer you didn't list (e.g. a host you didn't think of, like Hostinger or Railway).",
  ].join("\n");
}

export function scanUser(
  meta: ProjectMeta,
  signalFiles: string[],
  fileContents: { path: string; content: string }[] = [],
) {
  const contents = fileContents.length
    ? fileContents.map((f) => `\n=== ${f.path} ===\n${f.content}`).join("\n")
    : "  (none — infer from the tree)";
  return [
    `Project: ${meta.name} (${meta.source})`,
    `Detected: ${meta.detectedType} · platform ${meta.platform} · ${meta.fileCount} files`,
    `Stack: ${meta.detectedStack.join(", ") || "unknown"}`,
    `Findings: ${meta.notes.join("; ")}`,
    `File tree (names only):`,
    ...signalFiles.slice(0, 60).map((f) => `  ${f}`),
    "",
    "KEY FILE CONTENTS (read these to judge what it is and how done it is):",
    contents,
  ].join("\n");
}

/* ------------------------------ app brief ------------------------------ */

export function briefSystem() {
  return [
    "You are FinalStretch. Write a tiny brief so you and the user agree on what they're building before you plan it.",
    "You are given the CONTENTS of the key files (README, entry point, core source). Read them — describe what the project ACTUALLY is, not what the filenames suggest.",
    'Return ONLY minified JSON: {"description":string,"goal":string,"audience":string,"plan":string,"unsure":boolean}',
    "- description: ONE plain sentence a non-technical friend would get. Name 1-2 CONCRETE things you can see in the code/README (a real screen, feature, or mechanic) so it reads as THIS project, not a generic template. Max ~25 words. No jargon dump.",
    "- If the files genuinely don't tell you what it does, set unsure:true and write the description as an honest guess: \"Looks like <X> — correct me below.\"",
    "- goal: a few plain words for what they want from launching (e.g. \"get people to pay for it\", \"get lots of free signups\", \"just get it live\").",
    "- audience: a few plain words for who it's for.",
    "- plan: ONE plain sentence — the approach you'll take (what you'll focus on to get this shipped). E.g. \"Get it deployable, finish the 2 unfinished screens, and prep the App Store listing.\"",
  ].join("\n");
}

export function briefUser(
  meta: ProjectMeta,
  answers: Answers,
  fileContents: { path: string; content: string }[] = [],
) {
  const a = Object.entries(answers)
    .map(([k, v]) => `  - ${k}: ${v}`)
    .join("\n");
  const contents = fileContents.length
    ? fileContents.map((f) => `\n=== ${f.path} ===\n${f.content}`).join("\n")
    : "  (none)";
  return [
    `Detected: ${meta.detectedType} · ${meta.detectedStack.join(", ") || "?"}`,
    `Findings: ${meta.notes.join("; ")}`,
    "KEY FILE CONTENTS (read to describe what it ACTUALLY is):",
    contents,
    `User answers:\n${a || "  (none)"}`,
  ].join("\n");
}

/* ------------------------------ checklist ------------------------------ */

export function checklistSystem(meta: ProjectMeta) {
  return [
    PERSONA,
    "",
    "TASK: convert the profile + brief + answers into a prioritized, finish-it plan. Return ONLY minified JSON — a compact LIST of items, no per-item instructions (those are fetched later):",
    "{ projectSummary: string; launchReadiness: number; tasks: { id: string; title: string; description: string; category: 'Critical Code Fixes'|'Deployment & Compliance'|'Product & Growth'|'Marketing & Assets'; severity: 'critical'|'high'|'medium'|'low'; estMinutes: number }[] }",
    "- 14 to 20 tasks, hardest blocker first, spread across ALL FOUR categories. Do NOT include a 'copilot' field — keep each item to those 6 keys only.",
    "- 'Product & Growth' = 5 to 9 items that serve the brief's goal(s): features to ADD for retention/conversion, features to CUT as bloat, onboarding changes, positioning/pricing, trust elements, activation nudges. Be specific to THIS app — reference real screens/features from the files. LEAN TOWARD MORE suggestions: include plenty of lower-value 'nice to have' ideas at severity 'low' — the user can dismiss any they disagree with, so err on the side of surfacing them.",
    "- At least 3 tasks overall must be non-code (admin / store / legal / marketing).",
    "- Inject the platform-specific compliance tasks that apply here:",
    `  ${PLATFORM_COMPLIANCE[meta.platform] ?? PLATFORM_COMPLIANCE.web}`,
    "- title: plain and specific, something doable in one sitting. Avoid jargon/acronyms in the title; if you must use a technical term, keep it to one.",
    "- description: ONE short plain sentence on why this matters for the goal — the way you'd say it to a non-technical founder. No jargon dump.",
    "- estMinutes: how long for an experienced dev WITH an AI assistant doing most of the typing. Most single items are 10-25 min. Only use 45+ for genuinely multi-file work. Do NOT pad. Cap at 90.",
    "- projectSummary: ONE short plain sentence — what the project is and the main thing left to do. No jargon. If you assumed a default for a skipped question, add a short '(assuming X)' clause.",
    "- launchReadiness: integer 55-90 for the CURRENT state.",
  ].join("\n");
}

export function checklistUser(
  meta: ProjectMeta,
  answers: Answers,
  brief?: AppBrief | null,
  corrections?: string[],
  prevChecklist?: { tasks: { id: string; title: string; category: string }[] } | null,
) {
  const a = Object.entries(answers)
    .map(([k, v]) => `  - ${k}: ${v}`)
    .join("\n");
  const revise = prevChecklist?.tasks?.length
    ? [
        "",
        "REVISION MODE: the user already has the plan below and just gave a correction. Return the FULL updated plan (same JSON shape), applying the corrections:",
        "- Keep the SAME `id` for any task that still applies (so the user doesn't lose progress).",
        "- DELETE tasks a correction makes pointless (e.g. a Vercel task after they say they deploy elsewhere).",
        "- Fix titles / descriptions / estMinutes that the corrections make wrong.",
        "- Add any newly-needed tasks. Keep the 4-category spread and 14-20 total.",
        "Current plan:",
        ...prevChecklist.tasks.map((t) => `  - [${t.id}] (${t.category}) ${t.title}`),
      ].join("\n")
    : "";
  return `Build the plan JSON. Launch template: ${launchTemplateName(
    meta.platform,
  )}.${briefBlock(brief)}${correctionsBlock(corrections)}${revise}\n\n${projectDigest(
    meta,
  )}\n\nUser answers:\n${a || "  (none)"}`;
}

/* ------------------------------- co-pilot ------------------------------- */

export function copilotSystem() {
  return [
    PERSONA,
    "",
    "TASK: the user opened ONE plan item. Give them the exact way to close it. Return ONLY minified JSON:",
    "{ summary: string; plainSummary: string; steps: { title: string; plain: string; detail: string }[]; codeDiff?: string; language?: string; manual?: string }",
    "- summary: one line — what 'done' looks like (may be slightly technical).",
    "- plainSummary: the SAME outcome in one sentence a non-technical founder gets. No file names, no library names, no jargon.",
    "- steps: 2 to 5. For each:",
    "   · title: 3-6 plain words.",
    "   · plain: ONE sentence — what this step accomplishes and why it matters, said to a non-technical founder. NO file paths, NO function/variable names, NO jargon. This is the default view.",
    "   · detail: the exact technical specifics an engineer follows — file paths, symbol names, commands, literal values. Can be terse.",
    "- Code fix → also fill codeDiff as a real unified diff with real file paths.",
    "- Manual (store, DNS, asset, policy text, provisioning, a product decision) → DO NOT return code. Use manual with a numbered click-path: exact site, menu names, field labels, paste-ready text. Each step's `plain` still stays non-technical.",
    "- No hedging. One path to done.",
  ].join("\n");
}

export function copilotUser(
  task: ChecklistTask,
  meta: ProjectMeta,
  brief?: AppBrief | null,
  corrections?: string[],
) {
  return `Item: ${task.title}\nWhy it matters: ${task.description}\nCategory: ${
    task.category
  } · Severity: ${task.severity}${briefBlock(brief)}${correctionsBlock(
    corrections,
  )}\n\n${projectDigest(meta)}`;
}

/* -------------------------------- execute ------------------------------- */

export function executeSystem() {
  return [
    PERSONA,
    "",
    "TASK: actually MAKE the change for this one plan item. Your output is applied AUTOMATICALLY — the files you return REPLACE the real files in the user's project with no human edit step. They must be COMPLETE and CORRECT.",
    "Output the JSON object and NOTHING else. No preamble, no explanation, no markdown fence. First character is '{'.",
    'Shape: {"summary":string,"files":[{"path":string,"action":"create"|"modify"|"delete","contents":string}],"commands":string[],"runLocally":string}',
    "- You are given the CURRENT contents of the relevant files below. Use them — do NOT ask for more, do NOT refuse.",
    "- files: every file that must change, each with its FULL final contents (the entire file, not a diff). For 'modify', start from the given current contents and change only what THIS item needs. Real paths, exactly as in the tree.",
    "- commands: install / migrate / codegen commands, in order (or []).",
    "- runLocally: one short paragraph — how to run it and what proves it worked.",
    "- If the item is genuinely non-code (a store submission, a decision), return files:[] and put the exact steps in runLocally.",
    "- Minimal, scoped change. No refactors, nothing unrelated.",
    "- SIZE LIMIT: touch at most ~5 files. If the item is bigger than that, ship the smallest working slice now and list what's left as concrete next steps in runLocally. It is better to return a complete, correct partial change than to run out of room.",
    "- Your JSON output MUST be complete and valid — every string closed, every brace balanced. Never stop mid-object.",
  ].join("\n");
}

export function executeUser(
  task: ChecklistTask,
  meta: ProjectMeta,
  brief: AppBrief | null,
  files: { path: string; content: string }[],
  instructions?: string,
  corrections?: string[],
) {
  const dump = files.length
    ? files.map((f) => `\n=== ${f.path} ===\n${f.content}`).join("\n")
    : "  (none retrieved — infer from the plan and the file tree below)";
  const directive = instructions?.trim()
    ? `EXACT INSTRUCTIONS FROM THE USER (follow these precisely — they may have edited the plan, e.g. told you to keep a screen you'd have removed):\n${instructions.trim()}`
    : task.copilot?.summary
      ? `Plan: ${task.copilot.summary}`
      : "";
  return [
    `Item to build: ${task.title}`,
    `Why: ${task.description}`,
    briefBlock(brief),
    correctionsBlock(corrections),
    `Detected: ${meta.detectedType} · ${meta.detectedStack.join(", ") || "?"}`,
    directive,
    task.copilot?.codeDiff ? `Suggested diff:\n${task.copilot.codeDiff}` : "",
    "",
    "CURRENT FILE CONTENTS:",
    dump,
    "",
    `Full file tree (for paths):\n${meta.fileTree.slice(0, 160).map((f) => `  ${f}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n");
}
