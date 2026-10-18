"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button, FieldError, Input, Label } from "@/components/ui/primitives";
import { sendPasswordResetAction, type AuthState } from "@/app/actions/auth";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-4 w-full">
      {pending ? "Sending…" : "Send reset link"}
    </Button>
  );
}

export function PasswordResetRequestForm() {
  const [state, action] = useActionState<AuthState, FormData>(sendPasswordResetAction, {});
  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <FieldError message={state.error} />
      {state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <Submit />
      <a href="/login" className="block text-center text-sm text-violet-700">
        Back to sign in
      </a>
    </form>
  );
}
