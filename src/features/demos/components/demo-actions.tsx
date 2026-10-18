"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, Rocket } from "lucide-react";

import { useToast } from "@/components/toast";
import { Alert, Button } from "@/components/ui/primitives";
import { ApiClientError, apiFetch } from "@/lib/client-api";

export function DemoActions({
  demoId,
  generationStatus,
  deploymentStatus,
  approved,
}: {
  demoId: string;
  generationStatus: string;
  deploymentStatus: string;
  approved: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<"approve" | "deploy" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const run = async (action: "approve" | "deploy") => {
    setBusy(action);
    setError(null);
    setConfigError(null);
    try {
      await apiFetch(`/api/v1/demos/${demoId}/${action}`, { method: "POST" });
      toast({
        title: action === "approve" ? "Demo approved" : "Deployment queued",
        description:
          action === "approve"
            ? "Deployment is now available for this artifact."
            : "The worker will confirm the real URL with Vercel before reporting success.",
        tone: "success",
      });
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 503) {
        setConfigError(caught.message);
      } else {
        setError(caught instanceof Error ? caught.message : "Action failed.");
      }
      toast({
        title: action === "approve" ? "Approval failed" : "Deployment request failed",
        description: caught instanceof Error ? caught.message : undefined,
        tone: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  const canApprove = generationStatus === "ready" || generationStatus === "approved";
  const deploying = deploymentStatus === "queued" || deploymentStatus === "deploying";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => void run("approve")}
          disabled={!canApprove || busy !== null}
          variant={approved ? "secondary" : "primary"}
        >
          {busy === "approve" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          )}
          {approved ? "Re-approve artifact" : "Approve demo"}
        </Button>
        <Button
          onClick={() => void run("deploy")}
          disabled={!approved || deploying || busy !== null}
          variant="secondary"
        >
          {busy === "deploy" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Rocket className="size-4" aria-hidden="true" />
          )}
          {deploying ? "Deployment in progress" : "Deploy to Vercel"}
        </Button>
      </div>

      {!approved && canApprove ? (
        <Alert tone="amber" title="Approval required">
          <p>Deployment stays disabled until a human approves the generated artifact.</p>
        </Alert>
      ) : null}
      {configError ? (
        <Alert tone="red" title="Vercel is not configured">
          <p>{configError}</p>
        </Alert>
      ) : null}
      {error ? (
        <Alert tone="red" title="Action failed">
          <p>{error}</p>
        </Alert>
      ) : null}
    </div>
  );
}
