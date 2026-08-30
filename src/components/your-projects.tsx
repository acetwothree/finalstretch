"use client";

import { motion } from "framer-motion";
import { ArrowRight, FolderGit2, Trash2 } from "lucide-react";
import { useFlow } from "@/lib/store";
import { GlowCard } from "@/components/ui/glow-card";

function ago(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function YourProjects() {
  const projects = useFlow((s) => s.projects);
  const resumeProject = useFlow((s) => s.resumeProject);
  const deleteProject = useFlow((s) => s.deleteProject);

  if (!projects.length) return null;

  return (
    <section id="projects" className="mx-auto mt-24 max-w-5xl px-5 scroll-mt-24">
      <h2 className="mb-6 text-center text-sm font-medium uppercase tracking-[0.25em] text-slate-500">
        Your projects
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {projects.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
          >
            <GlowCard className="group flex items-center gap-4 p-4 transition-colors hover:border-violet-400/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-violet-300">
                <FolderGit2 className="h-4 w-4" />
              </div>
              <button
                onClick={() => resumeProject(p.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-semibold tracking-tight text-white">
                  {p.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {p.detectedType} · {p.readiness}% to launch · {p.doneCount}/
                  {p.taskCount} done · {ago(p.updatedAt)}
                </p>
              </button>
              <button
                onClick={() => resumeProject(p.id)}
                aria-label={`Resume ${p.name}`}
                className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => deleteProject(p.id)}
                aria-label={`Delete ${p.name}`}
                className="shrink-0 rounded-lg p-2 text-slate-600 opacity-0 transition-[opacity,color] hover:text-rose-300 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </GlowCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
