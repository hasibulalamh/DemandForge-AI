import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { DeploymentBadge, GenerationBadge } from "@/components/status-badges";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { listDemos } from "@/features/demos/queries";
import { formatRelative, titleCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Demos" };

export default async function DemosPage() {
  const demos = await listDemos();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Delivery"
        title="Concept demos"
        description="Static, self-contained demo sites. Approval is a human step and is required before deployment."
        actions={
          <ButtonLink href="/demo-studio" variant="secondary">
            Open demo studio
          </ButtonLink>
        }
      />

      {demos.length === 0 ? (
        <EmptyState
          title="No demos generated yet"
          description="Analyse a lead and generate a concept site. Generated files are validated before they are stored."
          action={
            <Link
              href="/demo-studio"
              className="text-sm font-medium text-violet-700 underline underline-offset-4"
            >
              Go to demo studio
            </Link>
          }
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
                  Template
                </th>
                <th scope="col" className="px-3 py-3">
                  Generation
                </th>
                <th scope="col" className="px-3 py-3">
                  Deployment
                </th>
                <th scope="col" className="px-3 py-3">
                  Updated
                </th>
                <th scope="col" className="px-5 py-3 text-right">
                  Live URL
                </th>
              </tr>
            </thead>
            <tbody>
              {demos.map((demo) => (
                <tr key={demo.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                  <td className="max-w-[320px] px-5 py-3">
                    <Link
                      href={`/demos/${demo.id}`}
                      className="font-medium text-zinc-900 hover:text-violet-700"
                    >
                      {demo.title}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {demo.leadTitle ?? "Lead removed"}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-600">{titleCase(demo.template_name)}</td>
                  <td className="px-3 py-3">
                    <GenerationBadge status={demo.generation_status} />
                  </td>
                  <td className="px-3 py-3">
                    <DeploymentBadge status={demo.deployment_status} />
                  </td>
                  <td className="px-3 py-3 text-xs whitespace-nowrap text-zinc-500">
                    {formatRelative(demo.updated_at)}
                  </td>
                  <td className="px-5 py-3 text-right text-xs">
                    {demo.deployment_url ? (
                      <a
                        href={demo.deployment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-violet-700 hover:text-violet-900"
                      >
                        <ExternalLink className="size-3" aria-hidden="true" />
                        Open
                      </a>
                    ) : (
                      <span className="text-zinc-400">Not deployed</span>
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
