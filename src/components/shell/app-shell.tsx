import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  children,
  displayName,
  email,
  role,
  warnings,
}: {
  children: ReactNode;
  displayName: string;
  email: string | null;
  role: string;
  warnings: string[];
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <Sidebar displayName={displayName} email={email} role={role} />
      <div className="flex min-h-screen min-w-0 flex-col">
        <Topbar email={email} />
        {warnings.length > 0 ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-2">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
              <span>{warnings.join(" · ")}</span>
              <Link href="/settings/integrations" className="font-semibold underline underline-offset-2">
                Review integrations
              </Link>
            </div>
          </div>
        ) : null}
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
        <footer className="border-t border-zinc-200 px-4 py-4 text-xs text-zinc-400 sm:px-6 lg:px-8">
          DemandForge AI · authorised sources only · every deployment requires human approval
        </footer>
      </div>
    </div>
  );
}
