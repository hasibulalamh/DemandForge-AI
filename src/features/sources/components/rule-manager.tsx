"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import { Badge, Button, FieldError, Hint, Input, Label } from "@/components/ui/primitives";
import { apiFetch } from "@/lib/client-api";
import type { Tables } from "@/types/database";

function toList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 100);
}

export function RuleManager({ rules }: { rules: Tables<"collection_rules">[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [excluded, setExcluded] = useState("");
  const [categories, setCategories] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Tables<"collection_rules"> | null>(null);

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/v1/collection-rules", {
        method: "POST",
        json: {
          name,
          keywords: toList(keywords),
          excludedKeywords: toList(excluded),
          projectCategories: toList(categories),
          isEnabled: true,
        },
      });
      toast({ title: "Collection rule saved", tone: "success" });
      setName("");
      setKeywords("");
      setExcluded("");
      setCategories("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the rule.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (rule: Tables<"collection_rules">) => {
    try {
      await apiFetch(`/api/v1/collection-rules/${rule.id}`, {
        method: "PATCH",
        json: { isEnabled: !rule.is_enabled },
      });
      router.refresh();
    } catch {
      toast({ title: "Could not update the rule", tone: "error" });
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/collection-rules/${pendingDelete.id}`, { method: "DELETE" });
      toast({ title: "Rule deleted", tone: "success" });
      setPendingDelete(null);
      router.refresh();
    } catch {
      toast({ title: "Could not delete the rule", tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="grid gap-4 lg:grid-cols-2">
        <div>
          <Label htmlFor="rule-name">Rule name</Label>
          <Input
            id="rule-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Website and web app requests"
            maxLength={160}
            required
          />
        </div>
        <div>
          <Label htmlFor="rule-categories">Project categories</Label>
          <Input
            id="rule-categories"
            value={categories}
            onChange={(event) => setCategories(event.target.value)}
            placeholder="web_development, ecommerce"
          />
          <Hint>Comma separated. Used for grouping and the relevance hint in the browser extension.</Hint>
        </div>
        <div>
          <Label htmlFor="rule-keywords">Include keywords</Label>
          <Input
            id="rule-keywords"
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            placeholder="website, landing page, next.js"
          />
        </div>
        <div>
          <Label htmlFor="rule-excluded">Exclude keywords</Label>
          <Input
            id="rule-excluded"
            value={excluded}
            onChange={(event) => setExcluded(event.target.value)}
            placeholder="free, student"
          />
        </div>
        <div className="lg:col-span-2">
          <FieldError message={error} />
          <Button type="submit" disabled={busy || name.trim().length === 0}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            Save rule
          </Button>
        </div>
      </form>

      {rules.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No rules yet. Rules decide which imported posts match your keywords before analysis.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {rules.map((rule) => (
            <li key={rule.id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900">{rule.name}</p>
                    <Badge tone={rule.is_enabled ? "green" : "zinc"}>
                      {rule.is_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {rule.keywords.map((keyword) => (
                      <Badge key={keyword} tone="violet">
                        {keyword}
                      </Badge>
                    ))}
                    {rule.excluded_keywords.map((keyword) => (
                      <Badge key={keyword} tone="red">
                        −{keyword}
                      </Badge>
                    ))}
                  </div>
                  {rule.project_categories.length > 0 ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      Categories: {rule.project_categories.join(", ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => void toggle(rule)}>
                    {rule.is_enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDelete(rule)}
                    aria-label={`Delete ${rule.name}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this rule?"
        description="Existing leads are unaffected. Future imports will no longer match this rule."
        confirmLabel="Delete rule"
        destructive
        busy={busy}
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
