"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button, FieldError, Input, Label } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { setupOwnerAction, type AuthState } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {pending ? "Please wait…" : label}
    </Button>
  );
}

export function SetupForm() {
  const [state, setup] = useActionState<AuthState, FormData>(setupOwnerAction, {});
  const [mode, setMode] = useState<"credentials" | "otp">("credentials");

  return (
    <div className="mt-6">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1" role="tablist">
        {(
          [
            ["credentials", "Email + password"],
            ["otp", "Email code"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === value ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <form action={setup} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>

        {mode === "credentials" ? (
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>
        ) : null}

        <div>
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            name="displayName"
            autoComplete="name"
            maxLength={120}
            placeholder="Your name"
          />
        </div>

        <div>
          <Label htmlFor="setupSecret">One-time setup secret</Label>
          <Input
            id="setupSecret"
            name="setupSecret"
            type="password"
            autoComplete="off"
            required
            placeholder="From OWNER_SETUP_SECRET"
          />
        </div>

        <FieldError message={state.error} />
        {state.message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {state.message}
          </p>
        ) : null}

        <SubmitButton label="Create account" />

        <p className="text-center text-xs text-zinc-400">
          Use a password you can remember. You can also sign in later with an email code.
        </p>
      </form>
    </div>
  );
}
