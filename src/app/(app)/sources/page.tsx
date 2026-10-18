import type { Metadata } from "next";

import { Alert, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/primitives";
import { SourceManager } from "@/features/sources/components/source-manager";
import { getSourceLeadCounts, listSources } from "@/features/sources/queries";

export const metadata: Metadata = { title: "Sources" };

export default async function SourcesPage() {
  const [sources, leadCounts] = await Promise.all([listSources(), getSourceLeadCounts()]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Authorised sources"
        description="Group imports by where they came from. Only sources you are permitted to read should be added."
      />

      <Alert tone="amber" title="Collection policy">
        <p>
          Automatically approved Meta API collection is not implemented. Approved automatic collection will
          appear here when it is available; until then use manual import or the user-initiated Chrome
          extension.
        </p>
      </Alert>

      <Card>
        <CardHeader>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Sources</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Deleting a source keeps its leads.</p>
          </div>
        </CardHeader>
        <CardBody>
          <SourceManager sources={sources} leadCounts={leadCounts} />
        </CardBody>
      </Card>
    </div>
  );
}
