"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Upload } from "lucide-react";

import { useToast } from "@/components/toast";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  FieldError,
  Hint,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { apiFetch } from "@/lib/client-api";

interface ImportResponse {
  duplicate: boolean;
  leadId: string;
  analysisStatus: string;
}

export function ImportLeadForm({ sources }: { sources: Array<{ id: string; source_name: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [analyze, setAnalyze] = useState(true);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const result = await apiFetch<ImportResponse>("/api/v1/leads", {
        method: "POST",
        json: {
          originalText: text,
          canonicalUrl: url.trim() || null,
          sourceId: sourceId || null,
        },
      });

      if (result.duplicate) {
        toast({
          title: "Already imported",
          description: "This post matches an existing lead. Opening it instead.",
          tone: "info",
        });
      } else {
        toast({ title: "Lead imported", description: "Duplicate check passed.", tone: "success" });
        if (analyze) {
          await apiFetch(`/api/v1/leads/${result.leadId}/analyze`, { method: "POST" });
          toast({
            title: "Analysis queued",
            description: "Gemini will process this lead shortly.",
            tone: "info",
          });
        }
        setText("");
        setUrl("");
      }

      router.push(`/leads/${result.leadId}`);
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Import failed.";
      setError(message);
      toast({ title: "Import failed", description: message, tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Upload className="size-4" aria-hidden="true" />
        Import lead
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Import a project request</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Paste only content you are authorised to view. The original URL is retained as evidence.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Close
        </Button>
      </CardHeader>
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="import-source">Source (optional)</Label>
              <Select
                id="import-source"
                value={sourceId}
                onChange={(event) => setSourceId(event.target.value)}
              >
                <option value="">No source</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.source_name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="import-url">Original URL (optional)</Label>
              <Input
                id="import-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://www.facebook.com/groups/…/posts/…"
                inputMode="url"
              />
              <Hint>Only http(s) URLs are accepted. Tracking parameters are removed.</Hint>
            </div>
          </div>

          <div>
            <Label htmlFor="import-text">Post text</Label>
            <Textarea
              id="import-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              minLength={20}
              maxLength={20000}
              required
              placeholder="Paste the full project request…"
              className="min-h-40"
            />
            <div className="mt-1.5 flex items-center justify-between">
              <Hint>Minimum 20 characters. Text is normalized for duplicate detection.</Hint>
              <span className="text-xs text-zinc-400">{text.length}/20000</span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={analyze}
              onChange={(event) => setAnalyze(event.target.checked)}
              className="size-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
            />
            Queue Gemini analysis immediately
          </label>

          <FieldError message={error} />

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={busy || text.trim().length < 20}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {busy ? "Importing…" : "Import lead"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
