"use client";

import { useState } from "react";

import { EmailCodeForm, PasswordForm } from "./auth-forms";

export function LoginForm({ configured, initialized }: { configured: boolean; initialized: boolean }) {
  const [mode, setMode] = useState<"signin" | "otp">("signin");

  // Before the workspace is initialized, no public sign-up tab exists. The first
  // owner is created through the one-time setup flow, not this login screen.
  return (
    <div className="mt-6">
      {!initialized ? (
        <p className="text-sm text-zinc-500">
          No account exists yet. Use the one-time setup link from your deployment instructions to create the
          first owner account.
        </p>
      ) : (
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1" role="tablist">
          {(
            [
              ["signin", "Sign in"],
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
      )}

      {initialized ? (
        mode === "signin" ? (
          <PasswordForm configured={configured} />
        ) : (
          <EmailCodeForm configured={configured} />
        )
      ) : null}
    </div>
  );
}

import { cn } from "@/lib/utils";
