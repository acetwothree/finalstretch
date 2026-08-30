import { NextResponse } from "next/server";
import type { ExecuteFile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRepo(url: string) {
  const m = url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/|$)/i);
  return m ? { owner: m[1], repo: m[2] } : null;
}

export async function POST(req: Request) {
  const { githubUrl, token, files, title, body } = (await req.json()) as {
    githubUrl: string;
    token: string;
    files: ExecuteFile[];
    title: string;
    body: string;
  };

  const repo = githubUrl ? parseRepo(githubUrl) : null;
  if (!repo || !token || !files?.length) {
    return NextResponse.json({ error: "missing repo, token, or files" }, { status: 400 });
  }
  const { owner, repo: name } = repo;
  const base = `https://api.github.com/repos/${owner}/${name}`;
  const h = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "finalstretch",
    "content-type": "application/json",
  };

  async function gh(path: string, init?: RequestInit) {
    const r = await fetch(path.startsWith("http") ? path : `${base}${path}`, {
      ...init,
      headers: { ...h, ...(init?.headers ?? {}) },
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(
        `${r.status} ${(json as { message?: string }).message ?? r.statusText}`,
      );
    }
    return json;
  }

  try {
    const info = (await gh("")) as { default_branch: string };
    const baseBranch = info.default_branch || "main";
    const ref = (await gh(`/git/ref/heads/${baseBranch}`)) as {
      object: { sha: string };
    };
    const branch = `finalstretch/${Date.now().toString(36)}`;
    await gh(`/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: ref.object.sha }),
    });

    for (const f of files) {
      const encPath = f.path.split("/").map(encodeURIComponent).join("/");
      let sha: string | undefined;
      try {
        const cur = (await gh(`/contents/${encPath}?ref=${branch}`)) as {
          sha: string;
        };
        sha = cur.sha;
      } catch {
        /* new file */
      }
      if (f.action === "delete") {
        if (sha) {
          await gh(`/contents/${encPath}`, {
            method: "DELETE",
            body: JSON.stringify({
              message: `FinalStretch: delete ${f.path}`,
              sha,
              branch,
            }),
          });
        }
      } else {
        await gh(`/contents/${encPath}`, {
          method: "PUT",
          body: JSON.stringify({
            message: `FinalStretch: ${f.action} ${f.path}`,
            content: Buffer.from(f.contents, "utf8").toString("base64"),
            branch,
            ...(sha ? { sha } : {}),
          }),
        });
      }
    }

    const pr = (await gh(`/pulls`, {
      method: "POST",
      body: JSON.stringify({ title, head: branch, base: baseBranch, body }),
    })) as { html_url: string; number: number };

    return NextResponse.json({ url: pr.html_url, number: pr.number, branch });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "github error" },
      { status: 502 },
    );
  }
}
