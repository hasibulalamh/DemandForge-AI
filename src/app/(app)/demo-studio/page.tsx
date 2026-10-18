import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { AnalysisBadge, GenerationBadge, ScoreBadge } from "@/components/status-badges";
import { Alert, Badge, Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/primitives";
import { CreateDemoForm } from "@/features/demo-studio/create-demo-form";
import { listDemos } from "@/features/demos/queries";
import { listLeads } from "@/features/leads/queries";
import { formatRelative, titleCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Demo studio" };

export default async function DemoStudioPage() {
  const [leads, demos] = await Promise.all([
    listLeads({ analysis: "analyzed", sort: "score", page: 1, pageSize: 20 }),
    listDemos(),
  ]);

  const demosByLead = new Map<string, number>();
  for (const demo of demos) {
    demosByLead.set(demo.lead_id, (demosByLead.get(demo.lead_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Delivery"
        title="Demo studio"
        description="Generate a static HTML/CSS/JavaScript concept site from an analysed lead. Every artifact is validated and requires your approval before deployment."
      />

      <Alert tone="violet" title="How generation works">
        <p>
          Gemini produces a design specification, then a deterministic renderer writes the files. The manifest
          is checked for unsafe scripts, external requests, and unexpected paths before it is stored.
        </p>
      </Alert>

      {leads.leads.length === 0 ? (
        <EmptyState
          title="No analysed leads yet"
          description="Import a project request and run the Gemini analysis. Analysed leads appear here, ranked by score."
          icon={<Sparkles className="size-5" aria-hidden="true" />}
          action={
            <Link href="/leads" className="text-sm font-medium text-violet-700 underline underline-offset-4">
              Go to leads
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {leads.leads.map((lead) => (
            <Card key={lead.id}>
              <CardHeader>
                <div className="min-w-0">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="text-sm font-medium text-zinc-900 hover:text-violet-700"
                  >
                    {lead.project_title ?? "Untitled request"}
                  </Link>
                  <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                    {lead.project_summary ?? lead.original_text.slice(0, 140)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <ScoreBadge score={lead.lead_score} />
                    <AnalysisBadge status={lead.analysis_status} />
                    {lead.project_category ? (
                      <Badge tone="neutral">{titleCase(lead.project_category)}</Badge>
                    ) : null}
                    <span className="text-xs text-zinc-400">
                      {demosByLead.get(lead.id) ?? 0} demo(s) · analysed {formatRelative(lead.updated_at)}
                    </span>
                  </div>
                </div>
                <div className="w-full sm:w-96">
                  <details className="group">
                    <summary className="cursor-pointer list-none">
                      <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700">
                        <Sparkles className="size-4" aria-hidden="true" />
                        Generate concept demo
                      </span>
                    </summary>
                    <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                      <CreateDemoForm
                        leadId={lead.id}
                        defaultTitle={`${lead.project_title ?? "Website"} — concept site`}
                      />
                    </div>
                  </details>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {demos.length > 0 ? (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-zinc-900">Recently generated</h2>
            <Link href="/demos" className="text-xs font-medium text-violet-700 hover:text-violet-900">
              All demos
            </Link>
          </CardHeader>
          <CardBody>
            <ul className="divide-y divide-zinc-100">
              {demos.slice(0, 5).map((demo) => (
                <li key={demo.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                  <div className="min-w-0">
                    <Link
                      href={`/demos/${demo.id}`}
                      className="text-sm font-medium text-zinc-900 hover:text-violet-700"
                    >
                      {demo.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {demo.leadTitle ?? "Lead removed"} · {titleCase(demo.template_name)}
                    </p>
                  </div>
                  <GenerationBadge status={demo.generation_status} />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
