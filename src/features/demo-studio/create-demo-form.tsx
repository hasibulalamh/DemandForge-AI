"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { useToast } from "@/components/toast";
import { Button, FieldError, Hint, Input, Label, Select } from "@/components/ui/primitives";
import { apiFetch } from "@/lib/client-api";

export function CreateDemoForm({
  leadId,
  defaultTitle,
  variant = "inline",
}: {
  leadId: string;
  defaultTitle: string;
  variant?: "inline" | "card";
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState(defaultTitle);
  const [template, setTemplate] = useState("local-service");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{ demo: { id: string } }>("/api/v1/demos", {
        method: "POST",
        json: { leadId, templateName: template, title },
      });
      toast({
        title: "Demo generation queued",
        description: "Gemini will draft the concept site; the worker validates it before you see it.",
        tone: "info",
      });
      router.push(`/demos/${result.demo.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not queue demo generation.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className={variant === "card" ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
        <div>
          <Label htmlFor={`demo-title-${leadId}`}>Demo title</Label>
          <Input
            id={`demo-title-${leadId}`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={160}
            required
          />
        </div>
        <div>
          <Label htmlFor={`demo-template-${leadId}`}>Template</Label>
          <Select
            id={`demo-template-${leadId}`}
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
          >
            <option value="local-service">Local service business</option>
            <option value="portfolio">Portfolio / personal brand</option>
            <option value="saas-landing">SaaS landing page</option>
          </Select>
        </div>
      </div>

      <Hint>Static HTML, CSS and JavaScript. Contact details stay fictional.</Hint>
      <FieldError message={error} />

      <Button type="submit" disabled={busy}>
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="size-4" aria-hidden="true" />
        )}
        Generate concept demo
      </Button>
    </form>
  );
}
