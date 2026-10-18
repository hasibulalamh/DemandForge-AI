import Link from "next/link";

import { AnalysisBadge, PipelineBadge, ScoreBadge } from "@/components/status-badges";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { formatRelative, titleCase } from "@/lib/utils";
import type { Tables } from "@/types/database";

export function LeadTable({ leads, compact = false }: { leads: Tables<"leads">[]; compact?: boolean }) {
  if (leads.length === 0) {
    return (
      <EmptyState
        title="No leads yet"
        description="Import a post you are authorised to view, or use the Chrome extension to capture one from the current tab."
        action={
          <Link
            href="/leads?import=1"
            className="text-sm font-medium text-violet-700 underline underline-offset-4 hover:text-violet-900"
          >
            Import your first lead
          </Link>
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-xs font-medium tracking-wide text-zinc-500 uppercase">
            <th scope="col" className="px-5 py-3">
              Project
            </th>
            <th scope="col" className="px-3 py-3">
              Score
            </th>
            <th scope="col" className="px-3 py-3">
              Analysis
            </th>
            <th scope="col" className="px-3 py-3">
              Pipeline
            </th>
            {!compact ? (
              <th scope="col" className="px-3 py-3">
                Category
              </th>
            ) : null}
            <th scope="col" className="px-5 py-3 text-right">
              Imported
            </th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
              <td className="max-w-[420px] px-5 py-3">
                <Link
                  href={`/leads/${lead.id}`}
                  className="line-clamp-1 font-medium text-zinc-900 hover:text-violet-700"
                >
                  {lead.project_title ?? "Untitled request"}
                </Link>
                <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                  {lead.project_summary ?? lead.original_text.slice(0, 120)}
                </p>
              </td>
              <td className="px-3 py-3">
                <ScoreBadge score={lead.lead_score} />
              </td>
              <td className="px-3 py-3">
                <AnalysisBadge status={lead.analysis_status} />
              </td>
              <td className="px-3 py-3">
                <PipelineBadge status={lead.pipeline_status} />
              </td>
              {!compact ? (
                <td className="px-3 py-3">
                  {lead.project_category ? (
                    <Badge tone="neutral">{titleCase(lead.project_category)}</Badge>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
              ) : null}
              <td className="px-5 py-3 text-right text-xs whitespace-nowrap text-zinc-500">
                {formatRelative(lead.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
