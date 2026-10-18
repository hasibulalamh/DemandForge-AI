import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export interface LeadListFilters {
  q?: string;
  pipeline?: string;
  analysis?: string;
  category?: string;
  minScore?: number;
  sort?: "newest" | "score" | "oldest";
  page: number;
  pageSize: number;
}

function safeSearchTerm(value: string): string {
  return value
    .replace(/[,()%_\\*]/g, " ")
    .trim()
    .slice(0, 120);
}

export interface LeadListResult {
  leads: Tables<"leads">[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listLeads(filters: LeadListFilters): Promise<LeadListResult> {
  const supabase = await createSupabaseServerClient();
  const from = (filters.page - 1) * filters.pageSize;

  let query = supabase.from("leads").select("*", { count: "exact" });

  const term = filters.q ? safeSearchTerm(filters.q) : "";
  if (term) {
    query = query.or(
      `project_title.ilike.%${term}%,project_summary.ilike.%${term}%,original_text.ilike.%${term}%,project_category.ilike.%${term}%`,
    );
  }
  if (filters.pipeline)
    query = query.eq("pipeline_status", filters.pipeline as Tables<"leads">["pipeline_status"]);
  if (filters.analysis)
    query = query.eq("analysis_status", filters.analysis as Tables<"leads">["analysis_status"]);
  if (filters.category) query = query.eq("project_category", filters.category);
  if (typeof filters.minScore === "number") query = query.gte("lead_score", filters.minScore);

  if (filters.sort === "score") {
    query = query
      .order("lead_score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  } else if (filters.sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, count, error } = await query.range(from, from + filters.pageSize - 1);
  if (error) throw new Error("Could not load leads.");

  return { leads: data ?? [], total: count ?? 0, page: filters.page, pageSize: filters.pageSize };
}

export async function getLead(id: string): Promise<Tables<"leads"> | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function getLeadDetail(id: string) {
  const supabase = await createSupabaseServerClient();
  const [lead, demos, outreach, jobs] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).maybeSingle(),
    supabase.from("demo_projects").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("outreach_records").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase
      .from("jobs")
      .select("id, job_type, status, attempt_count, max_attempts, last_error, created_at, updated_at")
      .eq("payload->>leadId", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    lead: lead.data,
    demos: demos.data ?? [],
    outreach: outreach.data ?? [],
    jobs: jobs.data ?? [],
  };
}

export async function getLeadCategories(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("leads")
    .select("project_category")
    .not("project_category", "is", null)
    .limit(500);

  const categories = new Set<string>();
  for (const row of data ?? []) {
    if (row.project_category) categories.add(row.project_category);
  }
  return [...categories].sort();
}
