import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Layers3, ShieldCheck } from "lucide-react";

import { isSupabaseConfigured, missingSupabaseEnv } from "@/lib/public-config";
import { isWorkspaceInitialized } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { Alert } from "@/components/ui/primitives";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Set up account" };

export default async function SetupPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-violet-700 p-10 text-white lg:flex">
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 text-white">
                <Layers3 className="size-5" aria-hidden="true" />
              </span>
              <span className="text-lg font-semibold tracking-tight">DemandForge AI</span>
            </div>
            <h1 className="mt-16 max-w-lg text-4xl leading-tight font-semibold tracking-tight">
              Set up your personal workspace.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-violet-100">
              Create the only account for this deployment. After confirmation, public sign-up is disabled and
              the workspace is ready for you to sign in from any of your devices.
            </p>
            <ul className="mt-10 space-y-4 text-sm text-violet-50">
              <li className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                One account, all of your leads, demos, and settings, synced across your PCs.
              </li>
            </ul>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-12 sm:px-8">
          <div className="w-full max-w-sm">
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
        </section>
      </div>
    );
  }

  const initialized = await isWorkspaceInitialized();
  if (initialized) {
    redirect("/login");
  }
  if (!serverEnv.ownerSetupSecret) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <Alert tone="amber" title="Owner setup is not enabled">
          Configure the server-only <code>OWNER_SETUP_SECRET</code> before opening the setup page.
        </Alert>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-violet-700 p-10 text-white lg:flex">
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 text-white">
              <Layers3 className="size-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold tracking-tight">DemandForge AI</span>
          </div>
          <h1 className="mt-16 max-w-lg text-4xl leading-tight font-semibold tracking-tight">
            Set up your personal workspace.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-violet-100">
            Create the only account for this deployment. After confirmation, public sign-up is disabled and
            the workspace is ready for you to sign in from any of your devices.
          </p>
          <ul className="mt-10 space-y-4 text-sm text-violet-50">
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              One account, all of your leads, demos, and settings, synced across your PCs.
            </li>
          </ul>
        </div>
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

          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Create your account</h2>
          <p className="mt-1 text-sm text-zinc-500">
            This is the only account for this deployment. Use it to sign in from all of your PCs.
          </p>

          <SetupForm />
        </div>
      </section>
    </div>
  );
}
