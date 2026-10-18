"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button, FieldError, Input, Label } from "@/components/ui/primitives";
import { updatePasswordAction, type AuthState } from "@/app/actions/auth";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-4 w-full">
      {pending ? "Updating…" : "Update password"}
    </Button>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState<AuthState, FormData>(updatePasswordAction, {});
  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <div>
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <FieldError message={state.error} />
      <Submit />
    </form>
  );
}
