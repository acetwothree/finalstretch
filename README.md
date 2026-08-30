# FinalStretch

**An AI "emergency room" for half-finished projects.** Drop a ZIP or connect a GitHub repo
that's stuck at 70–90% done. FinalStretch scans the code, asks 2–3 clarifying questions,
generates a prioritized launch checklist, and walks you through shipping it with an AI
co-pilot that hands you the exact diff or step.

> You built 80% of your app. Let's finish the last 20% together.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS 4** + **Framer Motion** for the flashy AI-gradient UI
- **Lucide** icons
- **Zustand** for the scan → questions → dashboard flow state machine
- **Anthropic Claude** (`claude-sonnet-5` by default) for analysis, checklist and co-pilot
- **JSZip** — dropped archives are parsed entirely in the browser, nothing is uploaded

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — see below
npm run dev
```

Open http://localhost:3000.

### With / without an API key

The app is fully functional **without** `ANTHROPIC_API_KEY` — every route
(`/api/analyze`, `/api/checklist`, `/api/copilot`) falls back to rich, stack-aware mock
data, so the entire flow works offline. Add a key to `.env.local` to get real
Claude-generated diagnoses, checklists, and fixes. Every AI route also degrades to the
mock on error, so the demo never dead-ends.

## How the flow works

| Stage | What happens | Code |
|---|---|---|
| `idle` | Landing page + drag-and-drop dropzone | `components/landing.tsx`, `components/dropzone.tsx` |
| `scanning` | ZIP parsed with JSZip (or GitHub tree pulled from the public API) → `classify()` heuristics → radar/terminal animation while `/api/analyze` runs | `lib/ingest.ts`, `lib/classify.ts`, `components/scanning-animation.tsx` |
| `questions` | 2–3 generated clarifying questions | `components/clarifying-questions.tsx` |
| `generating` → `dashboard` | `/api/checklist` builds the ranked task list; progress ring + animated checkboxes; per-task **AI Co-Pilot drawer** with diff / steps | `components/dashboard/*` |

State lives in `lib/store.ts` (Zustand). Readiness recomputes from severity-weighted task
completion in `computeReadiness()`.

## Project layout

```
src/
  app/
    page.tsx              # renders <Flow/>
    api/{analyze,checklist,copilot}/route.ts
  components/
    landing.tsx hero.tsx dropzone.tsx project-ticker.tsx how-it-works.tsx
    scanning-animation.tsx clarifying-questions.tsx flow.tsx
    dashboard/            # dashboard, task-row, animated-check, readiness-panel, copilot-drawer
    ui/                   # button, glow-card, progress, progress-ring
  lib/
    ingest.ts classify.ts store.ts anthropic.ts prompts.ts mock.ts normalize.ts types.ts utils.ts
```
