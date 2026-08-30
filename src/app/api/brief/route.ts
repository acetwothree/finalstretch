import { NextResponse } from "next/server";
import { aiEnabled, askJson, SCAN_MODEL } from "@/lib/anthropic";
import { mockBrief } from "@/lib/mock";
import { normalizeBrief } from "@/lib/normalize";
import { briefSystem, briefUser } from "@/lib/prompts";
import { pickSignalFiles } from "@/lib/signal-files";
import type { Answers, ProjectMeta } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { meta, answers } = (await req.json()) as {
    meta: ProjectMeta;
    answers: Answers;
  };
  if (!meta) return NextResponse.json({ error: "missing meta" }, { status: 400 });

  if (!aiEnabled()) {
    return NextResponse.json({ ...mockBrief(meta, answers ?? {}), source: "mock" });
  }

  try {
    const signal = pickSignalFiles(meta.fileTree, 36);
    const raw = await askJson<unknown>({
      model: SCAN_MODEL,
      system: briefSystem(),
      user: briefUser(meta, answers ?? {}, signal),
      maxTokens: 500,
    });
    return NextResponse.json({ ...normalizeBrief(raw), source: "ai" });
  } catch (err) {
    console.error("[brief] falling back to mock:", err);
    return NextResponse.json({ ...mockBrief(meta, answers ?? {}), source: "mock" });
  }
}
