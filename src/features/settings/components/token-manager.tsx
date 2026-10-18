"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, KeyRound, Loader2, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import { Alert, Badge, Button, FieldError, Input, Label } from "@/components/ui/primitives";
import { apiFetch } from "@/lib/client-api";
import { formatDateTime, formatRelative } from "@/lib/utils";

interface TokenRow {
  id: string;
  name: string;
  token_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export function TokenManager({ tokens }: { tokens: TokenRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<TokenRow | null>(null);

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<TokenRow & { token: string }>("/api/v1/tokens", {
        method: "POST",
        json: { name },
      });
      setCreated(result.token);
      setName("");
      toast({ title: "Token created", description: "Copy it now — it is shown once.", tone: "success" });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the token.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!pendingRevoke) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/tokens/${pendingRevoke.id}`, { method: "DELETE" });
      toast({ title: "Token revoked", tone: "success" });
      setPendingRevoke(null);
      router.refresh();
    } catch {
      toast({ title: "Could not revoke the token", tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={create} className="flex flex-wrap items-end gap-3">
        <div className="min-w-52 flex-1">
          <Label htmlFor="token-name">Token name</Label>
          <Input
            id="token-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Chrome extension — laptop"
            maxLength={120}
            required
          />
        </div>
        <Button type="submit" disabled={busy || name.trim() === ""}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <KeyRound className="size-4" aria-hidden="true" />
          )}
          Create token
        </Button>
      </form>

      <FieldError message={error} />

      {created ? (
        <Alert tone="violet" title="Copy this token now">
          <p className="font-mono text-xs break-all">{created}</p>
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void navigator.clipboard?.writeText(created);
                toast({ title: "Token copied", tone: "success" });
              }}
            >
              <Copy className="size-3.5" aria-hidden="true" />
              Copy
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCreated(null)}>
              Dismiss
            </Button>
          </div>
          <p className="mt-2 text-xs">
            Only a hash is stored. If you lose it, revoke the token and create a new one.
          </p>
        </Alert>
      ) : null}

      {tokens.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No tokens yet. The extension needs one token to import leads on your behalf.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {tokens.map((token) => (
            <li key={token.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-900">{token.name}</p>
                  <Badge tone={token.revoked_at ? "zinc" : "green"}>
                    {token.revoked_at ? "Revoked" : "Active"}
                  </Badge>
                </div>
                <p className="mt-0.5 font-mono text-xs text-zinc-500">{token.token_prefix}…</p>
                <p className="mt-0.5 text-[10px] text-zinc-400">
                  created {formatDateTime(token.created_at)} · last used{" "}
                  {token.last_used_at ? formatRelative(token.last_used_at) : "never"}
                </p>
              </div>
              {!token.revoked_at ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingRevoke(token)}
                  aria-label={`Revoke ${token.name}`}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Revoke
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingRevoke !== null}
        title="Revoke this token?"
        description="The extension will stop working immediately with this token."
        confirmLabel="Revoke token"
        destructive
        busy={busy}
        onConfirm={revoke}
        onCancel={() => setPendingRevoke(null)}
      />
    </div>
  );
}
