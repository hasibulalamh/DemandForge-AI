"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Blocks,
  Database,
  LayoutDashboard,
  Layers3,
  Menu,
  MessageSquare,
  MonitorSmartphone,
  Rocket,
  Settings,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAVIGATION = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/leads", label: "Leads", icon: Blocks },
      { href: "/sources", label: "Sources", icon: Database },
      { href: "/collection-rules", label: "Collection rules", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Delivery",
    items: [
      { href: "/demo-studio", label: "Demo studio", icon: Sparkles },
      { href: "/demos", label: "Demos", icon: MonitorSmartphone },
      { href: "/deployments", label: "Deployments", icon: Rocket },
      { href: "/outreach", label: "Outreach", icon: MessageSquare },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

export function Sidebar({
  displayName,
  email,
  role,
}: {
  displayName: string;
  email: string | null;
  role: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-violet-600 text-white">
            <Layers3 className="size-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold tracking-tight">DemandForge AI</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <aside
        className={cn(
          "z-40 w-full shrink-0 border-r border-zinc-200 bg-white lg:sticky lg:top-0 lg:block lg:h-screen lg:w-60",
          open ? "block" : "hidden lg:block",
        )}
      >
        <div className="hidden items-center gap-2 px-5 py-5 lg:flex">
          <span className="flex size-8 items-center justify-center rounded-lg bg-violet-600 text-white">
            <Layers3 className="size-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold tracking-tight">DemandForge AI</span>
        </div>

        <nav aria-label="Main navigation" className="px-3 pb-6">
          {NAVIGATION.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-1.5 px-2 text-[10px] font-semibold tracking-widest text-zinc-400 uppercase">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-violet-50 text-violet-700"
                            : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                        )}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mx-3 mt-auto hidden rounded-xl border border-zinc-200 bg-zinc-50 p-3 lg:block">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
              {initials || "DF"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">{displayName}</p>
              <p className="truncate text-xs text-zinc-500">{email ?? role}</p>
            </div>
          </div>
          <p className="mt-2 text-[10px] font-medium tracking-wide text-zinc-400 uppercase">{role}</p>
        </div>
      </aside>
    </>
  );
}
