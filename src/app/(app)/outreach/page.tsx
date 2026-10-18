import type { Metadata } from "next";

import { Alert, Card, EmptyState, PageHeader, StatCard } from "@/components/ui/primitives";
import { OutreachTable } from "@/features/outreach/components/outreach-table";
import { getOutreachStats, listOutreach } from "@/features/outreach/queries";
import { formatNumber, titleCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Outreach" };

export default async function OutreachPage() {
  const [records, stats] = await Promise.all([listOutreach(), getOutreachStats()]);
  const sent = (stats.sent ?? 0) + (stats.replied ?? 0) + (stats.converted ?? 0) + (stats.no_response ?? 0);
  const replies = (stats.replied ?? 0) + (stats.converted ?? 0);
  const conversion = sent > 0 ? Math.round((replies / sent) * 100) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Delivery"
        title="Outreach tracking"
        description="Drafts and outcomes. DemandForge prepares text only — you send it yourself and record the result."
      />

      <Alert tone="amber" title="No automated messaging">
        <p>
          The product never posts, comments, or sends messages, and never automates Facebook actions on your
          behalf. Status changes here are manual records of what you did.
        </p>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Drafts" value={formatNumber(stats.draft ?? 0)} hint="Not sent yet" />
        <StatCard label="Sent" value={formatNumber(sent)} hint="Sent, replied, or closed" />
        <StatCard
          label="Reply rate"
          value={conversion === null ? "—" : `${conversion}%`}
          hint={conversion === null ? "No sent messages yet" : `${formatNumber(replies)} replies`}
        />
      </div>

      {records.length === 0 ? (
        <EmptyState
          title="No outreach drafts"
          description="Open a lead and save a draft to start tracking outreach. Drafts attach to the lead and optional demo."
        />
      ) : (
        <OutreachTable records={records} />
      )}

      {Object.keys(stats).length > 0 ? (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Status breakdown</h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
            {Object.entries(stats).map(([status, count]) => (
              <li key={status} className="rounded-full bg-zinc-100 px-2.5 py-1">
                {titleCase(status)}: <span className="font-medium text-zinc-900">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
