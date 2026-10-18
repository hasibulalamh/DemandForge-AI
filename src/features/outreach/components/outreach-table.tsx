"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/toast";
import { Badge, Card, Select } from "@/components/ui/primitives";
import { apiFetch } from "@/lib/client-api";
import { formatDateTime, titleCase } from "@/lib/utils";

interface OutreachRow {
  id: string;
  lead_id: string;
  leadTitle: string | null;
  channel: string;
  status: string;
  draft_content: string;
  created_at: string;
  sent_at: string | null;
  response_at: string | null;
}

const STATUSES = ["draft", "ready", "sent", "replied", "no_response", "converted", "archived"];

export function OutreachTable({ records }: { records: OutreachRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const update = async (record: OutreachRow, status: string) => {
    setBusyId(record.id);
    try {
      await apiFetch(`/api/v1/outreach/${record.id}`, { method: "PATCH", json: { status } });
      toast({ title: "Outreach updated", description: `Marked as ${titleCase(status)}.`, tone: "success" });
      router.refresh();
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : undefined,
        tone: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <Card key={record.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/leads/${record.lead_id}`}
                className="text-sm font-medium text-zinc-900 hover:text-violet-700"
              >
                {record.leadTitle ?? "Lead removed"}
              </Link>
              <p className="mt-1 text-xs whitespace-pre-wrap text-zinc-600">{record.draft_content}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-zinc-400">
                <Badge tone="neutral">{titleCase(record.channel)}</Badge>
                <span>created {formatDateTime(record.created_at)}</span>
                {record.sent_at ? <span>· sent {formatDateTime(record.sent_at)}</span> : null}
                {record.response_at ? <span>· replied {formatDateTime(record.response_at)}</span> : null}
              </div>
            </div>
            <div className="w-44">
              <label className="sr-only" htmlFor={`status-${record.id}`}>
                Outreach status
              </label>
              <Select
                id={`status-${record.id}`}
                value={record.status}
                disabled={busyId === record.id}
                onChange={(event) => void update(record, event.target.value)}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {titleCase(status)}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-[10px] text-zinc-400">You send messages yourself.</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
