import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export interface DashboardData {
  counts: {
    leads: number;
    newLeads: number;
    analyzedLeads: number;
    demosReady: number;
    demosDeployed: number;
    outreachSent: number;
    outreachReplied: number;
    activeJobs: number;
    failedJobs: number;
    sources: number;
  };
  recentLeads: Tables<"leads">[];
  recentDemos: Tables<"demo_projects">[];
  categories: Array<{ category: string; count: number }>;
  recentJobs: Tables<"jobs">[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();

  const [
    leads,
    newLeads,
    analyzedLeads,
    demosReady,
    demosDeployed,
    outreachSent,
    outreachReplied,
    activeJobs,
    failedJobs,
    sources,
    recentLeads,
    recentDemos,
    recentJobs,
    categoryRows,
  ] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("pipeline_status", "new"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("analysis_status", "analyzed"),
    supabase
      .from("demo_projects")
      .select("id", { count: "exact", head: true })
      .in("generation_status", ["ready", "approved"]),
    supabase
      .from("demo_projects")
      .select("id", { count: "exact", head: true })
      .eq("deployment_status", "deployed"),
    supabase
      .from("outreach_records")
      .select("id", { count: "exact", head: true })
      .in("status", ["sent", "replied", "no_response", "converted"]),
    supabase
      .from("outreach_records")
      .select("id", { count: "exact", head: true })
      .in("status", ["replied", "converted"]),
    supabase.from("jobs").select("id", { count: "exact", head: true }).in("status", ["queued", "running"]),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("sources").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("demo_projects").select("*").order("created_at", { ascending: false }).limit(4),
    supabase.from("jobs").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("leads").select("project_category").not("project_category", "is", null).limit(1000),
  ]);

  const categoryMap = new Map<string, number>();
  for (const row of categoryRows.data ?? []) {
    if (!row.project_category) continue;
    categoryMap.set(row.project_category, (categoryMap.get(row.project_category) ?? 0) + 1);
  }

  return {
    counts: {
      leads: leads.count ?? 0,
      newLeads: newLeads.count ?? 0,
      analyzedLeads: analyzedLeads.count ?? 0,
      demosReady: demosReady.count ?? 0,
      demosDeployed: demosDeployed.count ?? 0,
      outreachSent: outreachSent.count ?? 0,
      outreachReplied: outreachReplied.count ?? 0,
      activeJobs: activeJobs.count ?? 0,
      failedJobs: failedJobs.count ?? 0,
      sources: sources.count ?? 0,
    },
    recentLeads: recentLeads.data ?? [],
    recentDemos: recentDemos.data ?? [],
    categories: [...categoryMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    recentJobs: recentJobs.data ?? [],
  };
}
