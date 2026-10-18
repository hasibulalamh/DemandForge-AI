"use client";

import React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button, FieldError, Input, Label } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { type AuthState, signInAction, sendOtpAction, verifyOtpAction } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {pending ? "Please wait…" : label}
    </Button>
  );
}

interface AuthFormsProps {
  configured: boolean;
  initialized: boolean;
}

export function PasswordForm({ configured }: Pick<AuthFormsProps, "configured">) {
  const [state, signIn] = useActionState<AuthState, FormData>(signInAction, {});

  return (
    <form action={signIn} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          disabled={!configured}
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          disabled={!configured}
        />
      </div>

      <FieldError message={state.error} />
      {state.message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {state.message}
        </p>
      ) : null}

      <SubmitButton label="Sign in" />

      <p className="text-center text-xs text-zinc-400">
        <a href="/forgot-password" className="font-medium text-violet-700 hover:text-violet-900">
          Forgot your password?
        </a>
      </p>
    </form>
  );
}

export function EmailCodeForm({ configured }: Pick<AuthFormsProps, "configured">) {
  const [otpState, sendOtp] = useActionState<AuthState, FormData>(sendOtpAction, {});
  const [verifyState, verifyOtp] = useActionState<AuthState, FormData>(verifyOtpAction, {});
  const [mode, setMode] = useState("request");
  const state = mode === "request" ? otpState : verifyState;

  return (
    <form action={mode === "request" ? sendOtp : verifyOtp} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          disabled={!configured}
        />
      </div>

      {mode === "code" ? (
        <div>
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            name="code"
            type="text"
            autoComplete="one-time-code"
            required
            inputMode="numeric"
            maxLength={10}
            placeholder="Enter the code"
            disabled={!configured}
          />
        </div>
      ) : null}

      <FieldError message={state.error} />
      {state.message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {state.message}
        </p>
      ) : null}

      {mode === "request" ? <SubmitButton label="Send email code" /> : <SubmitButton label="Verify code" />}

      {mode === "request" ? (
        <p className="text-center text-xs text-zinc-400">
          A one-time code will be sent to your email. Enter it above to sign in.
        </p>
      ) : (
        <div className="flex justify-between">
          <p className="text-center text-xs text-zinc-400">Code expired or wrong?</p>
          <button
            type="button"
            onClick={() => setMode("request")}
            className={cn(
              "text-xs font-medium text-violet-700 underline underline-offset-4 hover:text-violet-900",
            )}
          >
            Request a new one
          </button>
        </div>
      )}
    </form>
  );
}

import { useState } from "react";
