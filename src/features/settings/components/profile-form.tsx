"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import { Button, FieldError, Input, Label } from "@/components/ui/primitives";
import { apiFetch } from "@/lib/client-api";

export function ProfileForm({ displayName }: { displayName: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(displayName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/v1/profile", { method: "PATCH", json: { displayName: name } });
      toast({ title: "Profile updated", tone: "success" });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="max-w-sm">
        <Label htmlFor="display-name">Display name</Label>
        <Input
          id="display-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          required
        />
      </div>
      <FieldError message={error} />
      <Button type="submit" disabled={busy || name.trim() === displayName}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        Save profile
      </Button>
    </form>
  );
}

export function DangerZone() {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await apiFetch("/api/v1/profile", { method: "DELETE", json: { confirm: "DELETE" } });
      toast({ title: "Account deleted", description: "All workspace data was removed.", tone: "success" });
      router.replace("/login");
    } catch (caught) {
      toast({
        title: "Could not delete the account",
        description: caught instanceof Error ? caught.message : undefined,
        tone: "error",
      });
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Deleting your account removes your profile, leads, sources, demos, artifacts, deployments, outreach
        records, and usage history. Approvals and deployments are auditable until deletion. This cannot be
        undone.
      </p>
      <Button variant="danger" className="mt-3" onClick={() => setOpen(true)}>
        Delete account and data
      </Button>

      <ConfirmDialog
        open={open}
        title="Delete your account?"
        description="Every lead, demo, artifact, deployment record, and outreach draft is permanently removed."
        confirmLabel="Delete everything"
        destructive
        busy={busy}
        onConfirm={remove}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

export function RefreshButton() {
  const router = useRouter();
  return (
    <Button variant="secondary" size="sm" onClick={() => router.refresh()}>
      Refresh
    </Button>
  );
}
