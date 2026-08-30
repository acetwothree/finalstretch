"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Monitor, Smartphone, Tablet, X } from "lucide-react";
import { useFlow } from "@/lib/store";
import { FinishLineBar } from "@/components/ui/finish-line-loader";
import {
  buildFileMap,
  canRunInBrowser,
  parseOwnerRepo,
  stackblitzTemplate,
} from "@/lib/preview";
import { cn } from "@/lib/utils";

type Device = "mobile" | "tablet" | "desktop";
const WIDTH: Record<Device, string> = {
  mobile: "390px",
  tablet: "834px",
  desktop: "100%",
};
type Status = "loading" | "ready" | "unsupported" | "error";

export function PreviewPanel() {
  const open = useFlow((s) => s.previewOpen);
  const close = useFlow((s) => s.closePreview);
  const meta = useFlow((s) => s.meta);
  const previewTaskId = useFlow((s) => s.previewTaskId);
  const task = useFlow((s) =>
    s.checklist?.tasks.find((t) => t.id === s.previewTaskId),
  );
  const pr = useFlow((s) =>
    s.previewTaskId ? s.prByTask[s.previewTaskId] : undefined,
  );

  const hostRef = useRef<HTMLDivElement>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [status, setStatus] = useState<Status>("loading");
  const [openUrl, setOpenUrl] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (!open || !meta) return;
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    setStatus("loading");
    setOpenUrl(null);
    host.innerHTML = "";

    const runnable = canRunInBrowser(meta);
    const or = parseOwnerRepo(meta.githubUrl);
    const embedOpts = {
      view: "preview" as const,
      height: 900,
      hideNavigation: true,
      forceEmbedLayout: true,
      clickToLoad: false,
    };
    const fitIframe = () => {
      const f = host.querySelector("iframe");
      if (f) {
        f.style.width = "100%";
        f.style.height = "100%";
        f.style.border = "0";
      }
    };
    // Flip to "ready" as soon as the iframe exists — don't wait on the SDK's
    // promise (it can hang while packages install, and the iframe shows its own
    // progress anyway).
    let poll: ReturnType<typeof setInterval> | undefined;
    let tries = 0;
    const watchIframe = () => {
      poll = setInterval(() => {
        tries++;
        if (cancelled || tries > 40) return clearInterval(poll);
        if (host.querySelector("iframe")) {
          fitIframe();
          setStatus("ready");
          clearInterval(poll);
        }
      }, 250);
    };

    (async () => {
      try {
        const sdk = (await import("@stackblitz/sdk")).default;
        // github — a change on its PR branch, or the current version
        if (meta.source === "github" && or) {
          const slug =
            previewTaskId && pr
              ? `${or.owner}/${or.repo}/tree/${pr.branch}`
              : `${or.owner}/${or.repo}`;
          setOpenUrl(`https://stackblitz.com/github/${slug}`);
          if (!runnable) {
            if (!cancelled) setStatus("unsupported");
            return;
          }
          watchIframe();
          await sdk.embedGithubProject(host, slug, embedOpts).catch(() => {});
          return;
        }

        // zip — base files, optionally with this change applied on top
        if (meta.source === "zip") {
          if (!runnable) {
            if (!cancelled) setStatus("unsupported");
            return;
          }
          const overlay =
            previewTaskId && task?.execute ? task.execute.files : [];
          const files = await buildFileMap(overlay);
          if (!files) {
            if (!cancelled) setStatus("error");
            return;
          }
          watchIframe();
          await sdk
            .embedProject(
              host,
              {
                title: meta.name,
                description: "FinalStretch preview",
                template: stackblitzTemplate(files),
                files,
              },
              embedOpts,
            )
            .catch(() => {});
          return;
        }

        if (!cancelled) setStatus("error");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, meta, previewTaskId, task, pr]);

  const heading = previewTaskId
    ? pr
      ? "Preview — with this change (PR branch)"
      : task?.execute
        ? "Preview — with this change applied"
        : "Live preview"
    : "Live preview — current version";

  return (
    <AnimatePresence>
      {open && meta && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[55] bg-obsidian/80"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 240, damping: 30 }}
            className="fixed inset-y-0 right-0 z-[55] flex w-full max-w-[980px] flex-col border-l border-cyan-400/20 bg-obsidian-soft shadow-[-20px_0_60px_-20px_rgb(34_211_238/0.4)]"
          >
            <header className="flex items-center justify-between gap-4 border-b border-white/10 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-white">
                  {heading}
                </p>
                <p className="truncate text-xs text-slate-500">{meta.name}</p>
              </div>
              <div className="flex items-center gap-1">
                {(
                  [
                    ["mobile", Smartphone],
                    ["tablet", Tablet],
                    ["desktop", Monitor],
                  ] as const
                ).map(([d, Icon]) => (
                  <button
                    key={d}
                    onClick={() => setDevice(d)}
                    aria-label={d}
                    className={cn(
                      "rounded-lg p-2 transition-colors",
                      device === d
                        ? "bg-cyan-500/15 text-cyan-200"
                        : "text-slate-500 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
                {openUrl && (
                  <a
                    href={openUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
                    aria-label="Open in a new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <button
                  onClick={close}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="relative flex-1 overflow-auto bg-black/30 p-3">
              {status === "loading" && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8">
                  <FinishLineBar
                    label="Booting your project…"
                    sub="First load installs packages — about 20–40s."
                  />
                </div>
              )}
              {status === "unsupported" && (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
                  <p className="text-sm text-slate-300">
                    This looks like a {meta.platform === "ios" ? "mobile" : meta.platform} project
                    — it can&apos;t run inside a browser preview.
                  </p>
                  {openUrl ? (
                    <a
                      href={openUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-xs text-slate-200 hover:border-cyan-400/40"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open the code in a browser editor
                    </a>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Download the project and open it in Xcode / your editor.
                    </p>
                  )}
                </div>
              )}
              {status === "error" && (
                <div className="flex h-full items-center justify-center px-8 text-center text-sm text-slate-400">
                  Couldn&apos;t start the preview
                  {meta.source === "zip"
                    ? " — the archive may be missing files. Re-scan and try again."
                    : ". Try “Open in a new tab.”"}
                </div>
              )}

              <div
                className="mx-auto h-full transition-[width] duration-200"
                style={{ width: WIDTH[device], maxWidth: "100%" }}
              >
                <div
                  ref={hostRef}
                  className={cn(
                    "h-full overflow-hidden rounded-lg bg-white",
                    status !== "ready" && "opacity-0",
                  )}
                />
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
