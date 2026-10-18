import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export async function listSources(): Promise<Tables<"sources">[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load sources.");
  return data ?? [];
}

export async function listCollectionRules(): Promise<Tables<"collection_rules">[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("collection_rules")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load collection rules.");
  return data ?? [];
}

export async function getSourceLeadCounts(): Promise<Record<string, number>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("leads").select("source_id").limit(5000);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (!row.source_id) continue;
    counts[row.source_id] = (counts[row.source_id] ?? 0) + 1;
  }
  return counts;
}
