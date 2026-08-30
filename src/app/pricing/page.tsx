import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { GlowCard } from "@/components/ui/glow-card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing — FinalStretch",
  description: "Free to try. $19/month for the full plan and done-for-you code.",
};

const CHANGES_PER_MONTH = 40;
const PRICE = 19;

const TIERS = [
  {
    name: "Free",
    price: "$0",
    cadence: "no card needed",
    tagline: "See if it gets your project.",
    cta: { label: "Try it free", href: "/" },
    featured: false,
    features: [
      "Scan one project",
      "See the plan (first 3 steps in full)",
      "Answer a couple of questions, get a checklist",
    ],
  },
  {
    name: "FinalStretch",
    price: `$${PRICE}`,
    cadence: "a month · cancel anytime",
    tagline: "Everything, plus it makes the changes for you.",
    cta: { label: `Get it — $${PRICE}/mo`, href: "/?upgrade=1" },
    featured: true,
    features: [
      "Scan as many projects as you want",
      "The whole checklist, not just the first few",
      "Ideas for what to add, cut, or fix — for your goal",
      `A “do it for me” button on any step (up to ${CHANGES_PER_MONTH} a month)`,
      "It writes the code, then you download it or it opens a GitHub PR",
      "Change anything before it runs · one-click undo",
    ],
    footnote: `Scanning and planning are unlimited. The ${CHANGES_PER_MONTH}/month cap is only on the button that writes actual code — that's the part that costs real money to run, so that's the only part that's counted. That's more than one a day.`,
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
          Try it free. Once you&apos;re in, every step has a button that makes the
          change for you — you get your project back with the fix already in it,
          or a GitHub pull request to look over.
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
          <p className="font-medium text-slate-200">Does it run my app like Claude Code?</p>
          <p className="mt-1 leading-relaxed">
            It writes the same real code changes. It can&apos;t run your app in
            the browser, so instead you get your project back as a download with
            the change already in it, or it opens a pull request on your GitHub
            repo. You can tweak any change first, and undo it after.
          </p>
        </div>
        <div>
          <p className="font-medium text-slate-200">Is the payment real?</p>
          <p className="mt-1 leading-relaxed">
            Not yet — this build has a pretend checkout so you can try everything.
            No card is charged.
          </p>
        </div>
      </div>

      <footer className="mt-16 text-center text-xs text-slate-600">
        FinalStretch · finalstretch.dev
      </footer>
    </main>
  );
}
