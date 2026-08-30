import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { GlowCard } from "@/components/ui/glow-card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing — FinalStretch",
  description: "Free to try. $39/month for the full plan and done-for-you code.",
};

const EXECUTE_LIMIT = 30;
const PRICE = 39;

const TIERS = [
  {
    name: "Free",
    price: "$0",
    cadence: "no credit card",
    tagline: "See if it gets your project.",
    cta: { label: "Start free", href: "/" },
    featured: false,
    features: [
      "1 project scan (ZIP or GitHub link)",
      "Personalised questions + the app-brief alignment step",
      "The plan, with the first 3 steps in full",
      "The rest of the steps are blurred until you upgrade",
    ],
  },
  {
    name: "FinalStretch",
    price: `$${PRICE}`,
    cadence: "per month · cancel anytime",
    tagline: "Everything, and it makes the changes for you.",
    cta: { label: `Start — $${PRICE}/mo`, href: "/?upgrade=1" },
    featured: true,
    features: [
      "Unlimited scans & full plans, all your projects",
      "The complete checklist — every step",
      "Product & growth recommendations for your goal(s)",
      `“Make this change for me” — Claude writes the real code (${EXECUTE_LIMIT} runs/mo)`,
      "One-click patched-project download, or open a Pull Request",
      "Edit any change before it runs · undo anything",
      "Markdown export + shareable plan links",
    ],
    footnote: `The ${EXECUTE_LIMIT}-runs/month cap keeps the price honest — a scan and a plan are basically free to run; writing code is the cost, so that's what's metered.`,
  },
];

export default function PricingPage() {
  return (
    <main className="relative mx-auto min-h-dvh max-w-4xl px-5 py-8">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <Logo />
      </div>

      <div className="mx-auto mt-14 max-w-2xl text-center">
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          One plan. It writes the code.
        </h1>
        <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-400 sm:text-base">
          Try it free. When you&apos;re in, every task has a &ldquo;make this
          change for me&rdquo; button — Claude writes the real files and hands you
          a patched copy of your project (or opens a PR).
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {TIERS.map((t) => (
          <GlowCard
            key={t.name}
            className={cn(
              "flex flex-col p-6",
              t.featured &&
                "border-violet-400/40 shadow-[0_0_0_1px_rgb(139_92_246/0.25),0_30px_80px_-24px_rgb(139_92_246/0.45)]",
            )}
          >
            {t.featured && (
              <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-200">
                <Sparkles className="h-3 w-3" />
                Everything included
              </span>
            )}
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              {t.name}
            </h2>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tracking-tight text-white">
                {t.price}
              </span>
              <span className="text-xs text-slate-500">{t.cadence}</span>
            </div>
            <p className="mt-2 text-sm text-slate-300">{t.tagline}</p>

            <Link
              href={t.cta.href}
              className={cn(
                "mt-5 flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-[filter,transform,background-color] duration-150 active:scale-[0.98]",
                t.featured
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_24px_-6px_rgb(139_92_246/0.8)] hover:brightness-110"
                  : "border border-white/15 bg-white/[0.03] text-slate-100 hover:border-violet-400/40",
              )}
            >
              {t.cta.label}
            </Link>

            <ul className="mt-6 space-y-2.5">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  {f}
                </li>
              ))}
            </ul>

            {t.footnote && (
              <p className="mt-5 border-t border-white/8 pt-3 text-xs leading-relaxed text-slate-500">
                {t.footnote}
              </p>
            )}
          </GlowCard>
        ))}
      </div>

      <div className="mx-auto mt-14 max-w-2xl space-y-4 text-sm text-slate-400">
        <div>
          <p className="font-medium text-slate-200">
            Does it run my project like Claude Code?
          </p>
          <p className="mt-1 leading-relaxed">
            It writes the same real code changes. It can&apos;t run your project
            in the browser — instead you get a one-click download of your project
            with the change applied, or it opens a Pull Request on your linked
            repo for you to review. You can edit any change before it runs and
            undo it after.
          </p>
        </div>
        <div>
          <p className="font-medium text-slate-200">Is the checkout real?</p>
          <p className="mt-1 leading-relaxed">
            This build ships a simulated checkout so you can try the whole flow —
            no card is charged. Wire it to Stripe before you launch.
          </p>
        </div>
      </div>

      <footer className="mt-16 text-center text-xs text-slate-600">
        FinalStretch · finalstretch.dev
      </footer>
    </main>
  );
}
