"use client";

import { useEffect, useState } from "react";
import { useFlow } from "@/lib/store";
import { BootSplash } from "@/components/boot-splash";
import { Landing } from "@/components/landing";
import { AnalyzingState } from "@/components/analyzing-state";
import { ClarifyingQuestions } from "@/components/clarifying-questions";
import { BriefConfirm } from "@/components/brief-confirm";
import { Dashboard } from "@/components/dashboard/dashboard";
import { UnlockModal } from "@/components/paywall/unlock-modal";

export function Flow() {
  const [mounted, setMounted] = useState(false);
  const stage = useFlow((s) => s.stage);
  const hydrated = useFlow((s) => s.hydrated);

  useEffect(() => {
    setMounted(true);
    const url = new URL(window.location.href);

    const plan = url.searchParams.get("plan");
    if (plan && useFlow.getState().loadSharedPlan(plan)) {
      url.searchParams.delete("plan");
      window.history.replaceState(null, "", url.pathname + url.search);
      return;
    }

    void useFlow.persist.rehydrate();

    if (url.searchParams.get("upgrade")) {
      setTimeout(() => useFlow.getState().openUnlock("tasks"), 60);
      url.searchParams.delete("upgrade");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, []);

  if (!mounted || !hydrated) return <BootSplash />;

  return (
    <>
      {stage === "scanning" ? (
        <AnalyzingState />
      ) : stage === "questions" ? (
        <ClarifyingQuestions />
      ) : stage === "brief" || stage === "generating" ? (
        <BriefConfirm />
      ) : stage === "dashboard" ? (
        <Dashboard />
      ) : (
        <Landing />
      )}
      <UnlockModal />
    </>
  );
}
