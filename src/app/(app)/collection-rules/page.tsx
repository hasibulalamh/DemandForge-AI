import type { Metadata } from "next";

import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/primitives";
import { RuleManager } from "@/features/sources/components/rule-manager";
import { listCollectionRules } from "@/features/sources/queries";

export const metadata: Metadata = { title: "Collection rules" };

export default async function CollectionRulesPage() {
  const rules = await listCollectionRules();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Collection rules"
        description="Keyword rules decide which imported posts are relevant. Matching is a hint, not a filter — nothing is dropped silently."
      />

      <Card>
        <CardHeader>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Rules</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              The Chrome extension shows which rule matched before you import.
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <RuleManager rules={rules} />
        </CardBody>
      </Card>
    </div>
  );
}
