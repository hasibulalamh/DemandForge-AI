"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Plug, Settings } from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const TITLES: Array<[string, string]> = [
  ["/dashboard", "Dashboard"],
  ["/leads", "Leads"],
  ["/sources", "Sources"],
  ["/collection-rules", "Collection rules"],
  ["/demo-studio", "Demo studio"],
  ["/demos", "Demos"],
  ["/deployments", "Deployments"],
  ["/outreach", "Outreach"],
  ["/settings/integrations", "Integrations"],
  ["/settings/usage", "AI usage"],
  ["/settings", "Settings"],
];

export function Topbar({ email }: { email: string | null }) {
  const pathname = usePathname();
  const title =
    TITLES.find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1] ?? "Workspace";

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <p className="truncate text-sm font-medium text-zinc-500">{title}</p>
          <span className="hidden rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-500 uppercase sm:inline">
            concept demos only
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/settings/integrations"
            className={cn(
              "hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 sm:flex",
              pathname.startsWith("/settings/integrations") && "bg-zinc-100 text-zinc-900",
            )}
          >
            <Plug className="size-3.5" aria-hidden="true" />
            Integrations
          </Link>
          <Link
            href="/settings"
            className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Account settings"
          >
            <Settings className="size-4" />
          </Link>
          <div className="mx-1 hidden h-5 w-px bg-zinc-200 sm:block" />
          <span className="hidden max-w-40 truncate text-xs text-zinc-500 md:inline">{email}</span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
