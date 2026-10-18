import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Layers3, ShieldCheck, Sparkles } from "lucide-react";

import { getAuthUser, isWorkspaceInitialized } from "@/lib/auth";
import { missingSupabaseEnv, isSupabaseConfigured } from "@/lib/public-config";
import { Alert } from "@/components/ui/primitives";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const configured = isSupabaseConfigured();
  let initialized = false;
  if (configured) {
    const user = await getAuthUser();
    if (user) redirect("/dashboard");
    initialized = await isWorkspaceInitialized();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-violet-700 p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute -top-40 -right-24 size-[420px] rounded-full bg-violet-500/40 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 text-white">
              <Layers3 className="size-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold tracking-tight">DemandForge AI</span>
          </div>
          <h1 className="mt-16 max-w-lg text-4xl leading-tight font-semibold tracking-tight">
            Turn authorised project requests into approved website demos.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-violet-100">
            Import leads you are allowed to see, extract requirements with Gemini, and publish concept demos
            only after a human approves them.
          </p>
          <ul className="mt-10 space-y-4 text-sm text-violet-50">
            <li className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Evidence-backed analysis — every score is explainable.
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Row Level Security and server-only credentials by default.
            </li>
          </ul>
        </div>
        <p className="relative text-xs text-violet-200">
          Concept demos use fictional copy. No automatic messaging or unauthorised collection.
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-violet-600 text-white">
                <Layers3 className="size-5" aria-hidden="true" />
              </span>
              <span className="text-lg font-semibold tracking-tight text-zinc-900">DemandForge AI</span>
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Welcome back</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Sign in to manage sources, leads, demos, and deployments.
          </p>

          {!configured ? (
            <div className="mt-6">
              <Alert tone="amber" title="Supabase is not configured">
                <p>
                  Add the following variables to <code className="font-mono text-xs">.env.local</code>, then
                  restart the dev server:
                </p>
                <ul className="mt-2 list-disc pl-4 font-mono text-xs">
                  {missingSupabaseEnv().map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
                <p className="mt-2">
                  See <span className="font-mono text-xs">docs/ENVIRONMENT-VARIABLES.md</span>.
                </p>
              </Alert>
            </div>
          ) : null}

          <LoginForm configured={configured} initialized={initialized} />
        </div>
      </section>
    </div>
  );
}
