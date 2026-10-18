"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/primitives";
import { apiFetch } from "@/lib/client-api";

export function AnalyzeButton({ leadId, analysisStatus }: { leadId: string; analysisStatus: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const running = analysisStatus === "queued" || analysisStatus === "analyzing";

  const run = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/leads/${leadId}/analyze`, { method: "POST" });
      toast({
        title: "Analysis queued",
        description: "The worker will extract requirements and evidence.",
        tone: "info",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Could not queue analysis",
        description: error instanceof Error ? error.message : "Unexpected error.",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      onClick={run}
      disabled={busy || running}
      variant={analysisStatus === "analyzed" ? "secondary" : "primary"}
    >
      {busy || running ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Sparkles className="size-4" aria-hidden="true" />
      )}
      {running
        ? "Analysis in progress"
        : analysisStatus === "analyzed"
          ? "Re-analyse"
          : "Analyse with Gemini"}
    </Button>
  );
}
