import type { Metadata } from "next";

import { Alert, Badge, Card, CardBody, CardHeader, PageHeader, StatCard } from "@/components/ui/primitives";
import { getUsageSummary } from "@/features/usage/queries";
import { serverEnv } from "@/lib/env";
import { formatDateTime, formatNumber, titleCase } from "@/lib/utils";

export const metadata: Metadata = { title: "AI usage" };

export default async function UsagePage() {
  const usage = await getUsageSummary();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Gemini usage"
        description="Every AI call is recorded with token counts and an estimated cost. Costs are estimates based on configured prices."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="API calls"
          value={formatNumber(usage.totals.calls)}
          hint={`${usage.totals.errors} errors`}
        />
        <StatCard label="Input tokens" value={formatNumber(usage.totals.inputTokens)} hint="Prompt side" />
        <StatCard
          label="Output tokens"
          value={formatNumber(usage.totals.outputTokens)}
          hint="Completion side"
        />
        <StatCard
          label="Estimated cost"
          value={`$${usage.totals.estimatedCost.toFixed(4)}`}
          hint={`${serverEnv.geminiModel} · $${serverEnv.geminiInputPricePerMillion}/M in, $${serverEnv.geminiOutputPricePerMillion}/M out`}
        />
      </div>

      {usage.totals.calls === 0 ? (
        <Alert tone="violet" title="No AI usage recorded yet">
          <p>
            Usage rows are written after each analysis or demo specification. If Gemini is not configured, no
            calls can be made.
          </p>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-zinc-900">By operation</h2>
          </CardHeader>
          <CardBody>
            {usage.byOperation.length === 0 ? (
              <p className="text-sm text-zinc-500">No data yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs tracking-wide text-zinc-500 uppercase">
                    <th scope="col" className="py-2">
                      Operation
                    </th>
                    <th scope="col" className="py-2 text-right">
                      Calls
                    </th>
                    <th scope="col" className="py-2 text-right">
                      Tokens in/out
                    </th>
                    <th scope="col" className="py-2 text-right">
                      Cost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usage.byOperation.map((row) => (
                    <tr key={row.operation} className="border-t border-zinc-100">
                      <td className="py-2 text-zinc-800">{titleCase(row.operation)}</td>
                      <td className="py-2 text-right text-zinc-600">{row.calls}</td>
                      <td className="py-2 text-right text-zinc-600">
                        {formatNumber(row.inputTokens)}/{formatNumber(row.outputTokens)}
                      </td>
                      <td className="py-2 text-right text-zinc-600">${row.cost.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-zinc-900">Recent calls</h2>
          </CardHeader>
          <CardBody>
            {usage.recent.length === 0 ? (
              <p className="text-sm text-zinc-500">No data yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 text-xs">
                {usage.recent.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-800">{titleCase(row.operation)}</p>
                      <p className="text-zinc-400">
                        {row.model} · {formatDateTime(row.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">
                        {formatNumber(row.input_usage)}/{formatNumber(row.output_usage)}
                      </span>
                      <Badge tone={row.status === "success" ? "green" : "red"}>{row.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
