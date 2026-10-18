"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import { Badge, Button, FieldError, Hint, Input, Label, Select } from "@/components/ui/primitives";
import { apiFetch } from "@/lib/client-api";
import { formatRelative } from "@/lib/utils";
import type { Tables } from "@/types/database";

export function SourceManager({
  sources,
  leadCounts,
}: {
  sources: Tables<"sources">[];
  leadCounts: Record<string, number>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState("manual");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Tables<"sources"> | null>(null);

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/v1/sources", {
        method: "POST",
        json: { sourceName: name, sourceType: type, sourceUrl: url.trim() || null },
      });
      toast({ title: "Source added", tone: "success" });
      setName("");
      setUrl("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add the source.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/sources/${pendingDelete.id}`, { method: "DELETE" });
      toast({ title: "Source removed", tone: "success" });
      setPendingDelete(null);
      router.refresh();
    } catch (caught) {
      toast({
        title: "Could not remove the source",
        description: caught instanceof Error ? caught.message : undefined,
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="grid gap-4 sm:grid-cols-[1.2fr_1fr_1.4fr_auto] sm:items-end">
        <div>
          <Label htmlFor="source-name">Source name</Label>
          <Input
            id="source-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Web dev groups"
            maxLength={160}
            required
          />
        </div>
        <div>
          <Label htmlFor="source-type">Type</Label>
          <Select id="source-type" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="manual">Manual import</option>
            <option value="chrome_extension">Chrome extension</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="source-url">Group or page URL (optional)</Label>
          <Input
            id="source-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.facebook.com/groups/…"
            inputMode="url"
          />
          <Hint>Meta API collection is not implemented — see docs/FACEBOOK-DATA-SOURCES.md.</Hint>
        </div>
        <Button type="submit" disabled={busy || name.trim().length === 0}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          Add
        </Button>
      </form>

      <FieldError message={error} />

      {sources.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No sources yet. Sources group imported leads and describe where content came from.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {sources.map((source) => (
            <li key={source.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900">{source.source_name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {leadCounts[source.id] ?? 0} leads · added {formatRelative(source.created_at)}
                </p>
                {source.source_url ? (
                  <p className="mt-0.5 max-w-md truncate text-xs text-zinc-400">{source.source_url}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={source.connection_status === "connected" ? "green" : "neutral"}>
                  {source.source_type.replace("_", " ")}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingDelete(source)}
                  aria-label={`Delete ${source.source_name}`}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove this source?"
        description="Leads keep their text and URLs but lose the source label. This cannot be undone."
        confirmLabel="Remove source"
        destructive
        busy={busy}
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
