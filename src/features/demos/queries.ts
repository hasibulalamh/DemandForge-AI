import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export interface DemoWithLead extends Tables<"demo_projects"> {
  leadTitle: string | null;
  leadCategory: string | null;
}

export async function listDemos(): Promise<DemoWithLead[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("demo_projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load demos.");
  if (!data || data.length === 0) return [];

  const leadIds = [...new Set(data.map((demo) => demo.lead_id))];
  const { data: leads } = await supabase
    .from("leads")
    .select("id, project_title, project_category")
    .in("id", leadIds);

  const byId = new Map((leads ?? []).map((lead) => [lead.id, lead]));

  return data.map((demo) => ({
    ...demo,
    leadTitle: byId.get(demo.lead_id)?.project_title ?? null,
    leadCategory: byId.get(demo.lead_id)?.project_category ?? null,
  }));
}

export async function getDemoDetail(id: string) {
  const supabase = await createSupabaseServerClient();
  const [demo, artifact, deployments, lead] = await Promise.all([
    supabase.from("demo_projects").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("demo_artifacts")
      .select("checksum, byte_size, manifest, created_at")
      .eq("demo_id", id)
      .maybeSingle(),
    supabase
      .from("deployments")
      .select("*")
      .eq("demo_project_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("demo_projects").select("lead_id").eq("id", id).maybeSingle(),
  ]);

  return {
    demo: demo.data,
    artifact: artifact.data,
    deployments: deployments.data ?? [],
    leadId: lead.data?.lead_id ?? demo.data?.lead_id ?? null,
  };
}

export async function getDemoArtifactFiles(demoId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("demo_artifacts")
    .select("files, checksum")
    .eq("demo_id", demoId)
    .maybeSingle();
  return data;
}

export async function listDeployments() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("deployments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Could not load deployments.");

  const demoIds = [...new Set((data ?? []).map((deployment) => deployment.demo_project_id))];
  const { data: demos } = demoIds.length
    ? await supabase.from("demo_projects").select("id, title, slug, deployment_url").in("id", demoIds)
    : { data: [] as Array<{ id: string; title: string; slug: string; deployment_url: string | null }> };

  const byId = new Map((demos ?? []).map((demo) => [demo.id, demo]));
  return (data ?? []).map((deployment) => ({
    ...deployment,
    demoTitle: byId.get(deployment.demo_project_id)?.title ?? "Untitled demo",
    demoSlug: byId.get(deployment.demo_project_id)?.slug ?? null,
  }));
}
