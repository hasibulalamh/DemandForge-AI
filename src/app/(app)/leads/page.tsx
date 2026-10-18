import type { Metadata } from "next";

import { LeadTable } from "@/components/lead-table";
import { Pagination } from "@/components/ui/pagination";
import { Card, CardBody, PageHeader } from "@/components/ui/primitives";
import { ImportLeadForm } from "@/features/leads/components/import-lead";
import { LeadFilters } from "@/features/leads/components/lead-filters";
import { listLeads } from "@/features/leads/queries";
import { listSources } from "@/features/sources/queries";
import { leadListQuerySchema } from "@/lib/validation/schemas";

export const metadata: Metadata = { title: "Leads" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = leadListQuerySchema.safeParse({
    q: first(raw.q),
    pipeline: first(raw.pipeline),
    analysis: first(raw.analysis),
    sort: first(raw.sort),
    page: first(raw.page),
    pageSize: first(raw.pageSize),
  });

  const filters = parsed.success
    ? parsed.data
    : {
        page: 1,
        pageSize: 10,
        sort: "newest" as const,
        q: undefined,
        pipeline: undefined,
        analysis: undefined,
      };

  const [result, sources] = await Promise.all([listLeads(filters), listSources()]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Leads"
        description="Project requests you are authorised to review. Duplicate imports are rejected per account."
        actions={
          <ImportLeadForm
            sources={sources.map((source) => ({ id: source.id, source_name: source.source_name }))}
          />
        }
      />

      <Card>
        <CardBody className="border-b border-zinc-100">
          <LeadFilters />
        </CardBody>
        <LeadTable leads={result.leads} />
        <Pagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          basePath="/leads"
          query={{
            q: filters.q,
            pipeline: filters.pipeline,
            analysis: filters.analysis,
            sort: filters.sort,
          }}
        />
      </Card>
    </div>
  );
}
