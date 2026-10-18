import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export interface OutreachWithLead extends Tables<"outreach_records"> {
  leadTitle: string | null;
}

export async function listOutreach(): Promise<OutreachWithLead[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("outreach_records")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Could not load outreach records.");
  if (!data || data.length === 0) return [];

  const leadIds = [...new Set(data.map((row) => row.lead_id))];
  const { data: leads } = await supabase.from("leads").select("id, project_title").in("id", leadIds);
  const byId = new Map((leads ?? []).map((lead) => [lead.id, lead.project_title]));

  return data.map((row) => ({ ...row, leadTitle: byId.get(row.lead_id) ?? null }));
}

export async function getOutreachStats() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("outreach_records").select("status").limit(2000);
  const stats: Record<string, number> = {};
  for (const row of data ?? []) stats[row.status] = (stats[row.status] ?? 0) + 1;
  return stats;
}
