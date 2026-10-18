import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { listDeployments } from "@/features/demos/queries";
import { formatDateTime, formatRelative, titleCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Deployments" };

export default async function DeploymentsPage() {
  const deployments = await listDeployments();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Delivery"
        title="Deployments"
        description="Every Vercel deployment attempt, including failures. Success means Vercel confirmed a build and returned the live URL."
      />

      {deployments.length === 0 ? (
        <EmptyState
          title="No deployments yet"
          description="Approve a generated demo and deploy it. Vercel credentials must be configured first."
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                <th scope="col" className="px-5 py-3">
                  Demo
                </th>
                <th scope="col" className="px-3 py-3">
                  Status
                </th>
                <th scope="col" className="px-3 py-3">
                  Vercel id
                </th>
                <th scope="col" className="px-3 py-3">
                  Requested
                </th>
                <th scope="col" className="px-5 py-3 text-right">
                  Live URL
                </th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((deployment) => (
                <tr key={deployment.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                  <td className="px-5 py-3">
                    <Link
                      href={`/demos/${deployment.demo_project_id}`}
                      className="font-medium text-zinc-900 hover:text-violet-700"
                    >
                      {deployment.demoTitle}
                    </Link>
                    {deployment.error_message ? (
                      <p className="mt-0.5 max-w-md text-xs text-red-600">{deployment.error_message}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <Badge
                      tone={
                        deployment.status === "ready"
                          ? "green"
                          : deployment.status === "error"
                            ? "red"
                            : deployment.status === "canceled"
                              ? "zinc"
                              : "amber"
                      }
                    >
                      {titleCase(deployment.status)}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-zinc-500">
                    {deployment.vercel_deployment_id?.slice(0, 16) ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-xs whitespace-nowrap text-zinc-500">
                    {formatRelative(deployment.created_at)}
                    {deployment.completed_at ? (
                      <span className="block text-zinc-400">
                        done {formatDateTime(deployment.completed_at)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-right text-xs">
                    {deployment.url ? (
                      <a
                        href={deployment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-violet-700 hover:text-violet-900"
                      >
                        <ExternalLink className="size-3" aria-hidden="true" />
                        Open
                      </a>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
