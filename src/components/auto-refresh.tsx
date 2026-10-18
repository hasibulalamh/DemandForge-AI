"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refreshes server data while a job is in flight. Stops after 3 minutes. */
export function AutoRefresh({ active, intervalMs = 5000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += intervalMs;
      router.refresh();
      if (elapsed >= 180_000) clearInterval(timer);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs, router]);

  return null;
}
