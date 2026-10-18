"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/toast";
import { Label, Select } from "@/components/ui/primitives";
import { apiFetch } from "@/lib/client-api";

const PIPELINE_STATES = [
  ["new", "New"],
  ["shortlisted", "Shortlisted"],
  ["demo_generated", "Demo generated"],
  ["deployed", "Deployed"],
  ["contacted", "Contacted"],
  ["replied", "Replied"],
  ["won", "Won"],
  ["lost", "Lost"],
  ["rejected", "Rejected"],
  ["archived", "Archived"],
] as const;

export function PipelineSelect({ leadId, value }: { leadId: string; value: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  const update = async (next: string) => {
    setPending(true);
    try {
      await apiFetch(`/api/v1/leads/${leadId}`, { method: "PATCH", json: { pipelineStatus: next } });
      toast({ title: "Pipeline updated", tone: "success" });
      router.refresh();
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unexpected error.",
        tone: "error",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <Label htmlFor="pipeline-status">Pipeline status</Label>
      <Select
        id="pipeline-status"
        value={value}
        disabled={pending}
        onChange={(event) => void update(event.target.value)}
      >
        {PIPELINE_STATES.map(([stateValue, label]) => (
          <option key={stateValue} value={stateValue}>
            {label}
          </option>
        ))}
      </Select>
    </div>
  );
}
