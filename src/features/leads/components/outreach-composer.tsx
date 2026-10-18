"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Send } from "lucide-react";

import { useToast } from "@/components/toast";
import { Button, FieldError, Hint, Label, Select, Textarea } from "@/components/ui/primitives";
import { apiFetch } from "@/lib/client-api";

export function OutreachComposer({
  leadId,
  demos,
  defaultContent,
}: {
  leadId: string;
  demos: Array<{ id: string; title: string }>;
  defaultContent: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [content, setContent] = useState(defaultContent);
  const [demoId, setDemoId] = useState("");
  const [channel, setChannel] = useState("facebook_message");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/v1/outreach", {
        method: "POST",
        json: {
          leadId,
          demoProjectId: demoId || null,
          channel,
          draftContent: content,
          status: "draft",
        },
      });
      toast({
        title: "Draft saved",
        description: "DemandForge never sends messages automatically.",
        tone: "success",
      });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the draft.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="outreach-channel">Channel</Label>
          <Select id="outreach-channel" value={channel} onChange={(event) => setChannel(event.target.value)}>
            <option value="facebook_message">Facebook message (manual send)</option>
            <option value="email">Email</option>
            <option value="other">Other</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="outreach-demo">Attach demo (optional)</Label>
          <Select id="outreach-demo" value={demoId} onChange={(event) => setDemoId(event.target.value)}>
            <option value="">No demo</option>
            {demos.map((demo) => (
              <option key={demo.id} value={demo.id}>
                {demo.title}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="outreach-content">Draft</Label>
        <Textarea
          id="outreach-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={8000}
          required
          className="min-h-32"
        />
        <Hint>You copy and send this yourself. Nothing is posted on your behalf.</Hint>
      </div>

      <FieldError message={error} />

      <Button type="submit" disabled={busy || content.trim().length === 0}>
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="size-4" aria-hidden="true" />
        )}
        Save draft
      </Button>
    </form>
  );
}
