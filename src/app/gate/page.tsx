"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Logo } from "@/components/ui/logo";

function GateForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/gate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = next;
    } else {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-obsidian-soft/80 p-7 backdrop-blur-sm"
      >
        <div className="mb-5 flex items-center justify-between">
          <Logo />
          <Lock className="h-4 w-4 text-slate-500" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-white">
          This preview is password-protected
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Enter the access password to continue.
        </p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-4 h-11 w-full rounded-xl border border-white/12 bg-white/[0.03] px-3.5 text-sm text-slate-100 outline-none focus:border-violet-400/60"
        />
        {error && (
          <p className="mt-2 text-xs text-rose-300">That&apos;s not it. Try again.</p>
        )}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-4 h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-sm font-semibold text-white transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}

export default function GatePage() {
  return (
    <Suspense fallback={null}>
      <GateForm />
    </Suspense>
  );
}
