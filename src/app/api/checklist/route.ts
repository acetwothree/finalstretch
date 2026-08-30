import { NextResponse } from "next/server";
import { aiEnabled, askJson } from "@/lib/anthropic";
import { mockChecklist } from "@/lib/mock";
import { normalizeChecklist } from "@/lib/normalize";
import { checklistSystem, checklistUser } from "@/lib/prompts";
import type { Answers, AppBrief, ProjectMeta } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { meta, answers, brief } = (await req.json()) as {
    meta: ProjectMeta;
    answers: Answers;
    brief?: AppBrief | null;
  };
  if (!meta) return NextResponse.json({ error: "missing meta" }, { status: 400 });

  if (!aiEnabled()) {
    return NextResponse.json(mockChecklist(meta, answers ?? {}, brief ?? null));
  }

  try {
    const raw = await askJson<unknown>({
      system: checklistSystem(meta),
      user: checklistUser(meta, answers ?? {}, brief ?? null),
      maxTokens: 2600,
    });
    return NextResponse.json(normalizeChecklist(raw));
  } catch (err) {
    console.error("[checklist] falling back to mock:", err);
    return NextResponse.json(mockChecklist(meta, answers ?? {}, brief ?? null));
  }
}
