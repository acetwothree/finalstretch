import { NextResponse } from "next/server";
import { aiEnabled, askJson } from "@/lib/anthropic";
import { mockExecute } from "@/lib/mock";
import { normalizeExecute } from "@/lib/normalize";
import { executeSystem, executeUser } from "@/lib/prompts";
import type { AppBrief, ChecklistTask, ProjectMeta } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  const { task, meta, brief, files, instructions, corrections } =
    (await req.json()) as {
      task: ChecklistTask;
      meta: ProjectMeta;
      brief?: AppBrief | null;
      files?: { path: string; content: string }[];
      instructions?: string;
      corrections?: string[];
    };
  if (!task || !meta)
    return NextResponse.json({ error: "missing task or meta" }, { status: 400 });

  if (!aiEnabled()) {
    return NextResponse.json({
      ...mockExecute(task, meta),
      source: "mock",
      note: "Set FINISHLINE_ANTHROPIC_API_KEY in .env.local (or your host) to have Claude write the real change.",
    });
  }

  try {
    const raw = await askJson<unknown>({
      system: executeSystem(),
      user: executeUser(
        task,
        meta,
        brief ?? null,
        files ?? [],
        instructions,
        corrections ?? [],
      ),
      maxTokens: 16000,
    });
    return NextResponse.json({ ...normalizeExecute(raw), source: "ai" });
  } catch (err) {
    console.error("[execute] falling back to mock:", err);
    return NextResponse.json({
      ...mockExecute(task, meta),
      source: "mock",
      note: "That run didn't produce a usable change — usually a one-off. Press “Do it for me” again; if it keeps happening, trim the plan to a smaller step.",
    });
  }
}
