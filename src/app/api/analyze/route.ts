import { NextResponse } from "next/server";
import { aiEnabled, askJson, SCAN_MODEL } from "@/lib/anthropic";
import { mockAnalysis } from "@/lib/mock";
import { normalizeAnalysis } from "@/lib/normalize";
import { scanSystem, scanUser } from "@/lib/prompts";
import { pickSignalFiles } from "@/lib/signal-files";
import type { ProjectMeta } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { meta, files } = (await req.json()) as {
    meta: ProjectMeta;
    files?: { path: string; content: string }[];
  };
  if (!meta) return NextResponse.json({ error: "missing meta" }, { status: 400 });

  if (!aiEnabled()) {
    return NextResponse.json({
      ...mockAnalysis(meta),
      source: "mock",
      mockReason: "no-key",
    });
  }

  try {
    const signal = pickSignalFiles(meta.fileTree);
    const raw = await askJson<unknown>({
      model: SCAN_MODEL,
      system: scanSystem(),
      user: scanUser(meta, signal, files ?? []),
      maxTokens: 900,
    });
    return NextResponse.json({ ...normalizeAnalysis(raw), source: "ai" });
  } catch (err) {
    console.error("[analyze] AI scan failed, using mock:", err);
    return NextResponse.json({
      ...mockAnalysis(meta),
      source: "mock",
      mockReason: "error",
    });
  }
}
