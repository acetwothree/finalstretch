import { NextResponse } from "next/server";
import { aiEnabled, askJson } from "@/lib/anthropic";
import { mockCopilot } from "@/lib/mock";
import { normalizeCopilot } from "@/lib/normalize";
import { copilotSystem, copilotUser } from "@/lib/prompts";
import type { AppBrief, ChecklistTask, ProjectMeta } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { task, meta, brief } = (await req.json()) as {
    task: ChecklistTask;
    meta: ProjectMeta;
    brief?: AppBrief | null;
  };
  if (!task || !meta)
    return NextResponse.json({ error: "missing task or meta" }, { status: 400 });

  if (!aiEnabled()) {
    return NextResponse.json(mockCopilot(task));
  }

  try {
    const raw = await askJson<unknown>({
      system: copilotSystem(),
      user: copilotUser(task, meta, brief ?? null),
      maxTokens: 1800,
    });
    return NextResponse.json(normalizeCopilot(raw));
  } catch (err) {
    console.error("[copilot] falling back to mock:", err);
    return NextResponse.json(mockCopilot(task));
  }
}
