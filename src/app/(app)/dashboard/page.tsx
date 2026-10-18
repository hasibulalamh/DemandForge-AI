import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowUpRight, Blocks, MonitorSmartphone, Sparkles, Users } from "lucide-react";

import { LeadTable } from "@/components/lead-table";
import { DeploymentBadge, GenerationBadge, JobBadge } from "@/components/status-badges";
import {
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  StatCard,
} from "@/components/ui/primitives";
import { getDashboardData } from "@/features/dashboard/queries";
import { formatNumber, formatRelative, titleCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const data = await getDashboardData();
  const { counts } = data;
  const maxCategory = Math.max(1, ...data.categories.map((category) => category.count));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Opportunity overview"
        description="Every number below comes from your Supabase workspace. Nothing is simulated."
        actions={
          <>
            <ButtonLink href="/leads?import=1" variant="primary">
              <Blocks className="size-4" aria-hidden="true" />
              Import lead
            </ButtonLink>
            <ButtonLink href="/demo-studio" variant="secondary">
              <Sparkles className="size-4" aria-hidden="true" />
              Demo studio
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Leads"
          value={formatNumber(counts.leads)}
          hint={`${formatNumber(counts.analyzedLeads)} analysed · ${formatNumber(counts.newLeads)} new`}
          icon={<Users className="size-4" />}
        />
        <StatCard
          label="Demos ready"
          value={formatNumber(counts.demosReady)}
          hint={`${formatNumber(counts.demosDeployed)} deployed to Vercel`}
          icon={<MonitorSmartphone className="size-4" />}
        />
        <StatCard
          label="Outreach"
          value={formatNumber(counts.outreachSent)}
          hint={`${formatNumber(counts.outreachReplied)} replies / conversions`}
          icon={<ArrowUpRight className="size-4" />}
        />
        <StatCard
          label="Background jobs"
          value={formatNumber(counts.activeJobs)}
          hint={
            counts.failedJobs > 0
              ? `${formatNumber(counts.failedJobs)} failed — review jobs`
              : "No failed jobs"
          }
          icon={<Activity className="size-4" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Latest leads</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Newest imports first</p>
            </div>
            <Link href="/leads" className="text-xs font-medium text-violet-700 hover:text-violet-900">
              View all
            </Link>
          </CardHeader>
          <LeadTable leads={data.recentLeads} compact />
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-zinc-900">Project categories</h2>
            </CardHeader>
            <CardBody>
              {data.categories.length === 0 ? (
                <p className="text-sm text-zinc-500">Categories appear after your first analysis.</p>
              ) : (
                <ul className="space-y-3">
                  {data.categories.map((category) => (
                    <li key={category.category}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-700">{titleCase(category.category)}</span>
                        <span className="text-zinc-500">{category.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-violet-500"
                          style={{ width: `${Math.round((category.count / maxCategory) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Recent demos</h2>
                <p className="mt-0.5 text-xs text-zinc-500">Concept sites and their state</p>
              </div>
            </CardHeader>
            {data.recentDemos.length === 0 ? (
              <CardBody>
                <EmptyState
                  title="No demos yet"
                  description="Analyse a lead, then generate a static concept site in the demo studio."
                  action={
                    <Link
                      href="/demo-studio"
                      className="text-sm font-medium text-violet-700 underline underline-offset-4"
                    >
                      Open demo studio
                    </Link>
                  }
                />
              </CardBody>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {data.recentDemos.map((demo) => (
                  <li key={demo.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/demos/${demo.id}`}
                        className="block truncate text-sm font-medium text-zinc-900 hover:text-violet-700"
                      >
                        {demo.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {demo.deployment_url ? "Live on Vercel" : "Not deployed"} ·{" "}
                        {formatRelative(demo.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <GenerationBadge status={demo.generation_status} />
                      <DeploymentBadge status={demo.deployment_status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-zinc-900">Worker activity</h2>
            </CardHeader>
            {data.recentJobs.length === 0 ? (
              <CardBody>
                <p className="text-sm text-zinc-500">No background jobs have run yet.</p>
              </CardBody>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {data.recentJobs.map((job) => (
                  <li key={job.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-xs">
                    <span className="font-medium text-zinc-700">{titleCase(job.job_type)}</span>
                    <span className="flex items-center gap-2 text-zinc-400">
                      attempt {job.attempt_count}/{job.max_attempts}
                      <JobBadge status={job.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
