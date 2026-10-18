import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, ShieldCheck } from "lucide-react";

import { AutoRefresh } from "@/components/auto-refresh";
import { DeploymentBadge, GenerationBadge } from "@/components/status-badges";
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  DefinitionList,
  EmptyState,
} from "@/components/ui/primitives";
import { DemoActions } from "@/features/demos/components/demo-actions";
import { getDemoDetail } from "@/features/demos/queries";
import { formatDateTime, formatNumber, formatRelative, titleCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Demo detail" };

interface ManifestFile {
  path: string;
  bytes: number;
  checksum: string;
}

function readManifest(manifest: unknown): {
  files: ManifestFile[];
  warnings: string[];
  template: string | null;
} {
  if (typeof manifest !== "object" || manifest === null) return { files: [], warnings: [], template: null };
  const record = manifest as Record<string, unknown>;
  const files = Array.isArray(record.files)
    ? record.files
        .filter(
          (file): file is ManifestFile =>
            typeof file === "object" &&
            file !== null &&
            typeof (file as ManifestFile).path === "string" &&
            typeof (file as ManifestFile).bytes === "number",
        )
        .map((file) => ({ path: file.path, bytes: file.bytes, checksum: file.checksum ?? "" }))
    : [];
  const warnings = Array.isArray(record.warnings)
    ? record.warnings.filter((warning): warning is string => typeof warning === "string")
    : [];
  return { files, warnings, template: typeof record.template === "string" ? record.template : null };
}

export default async function DemoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { demo, artifact, deployments, leadId } = await getDemoDetail(id);
  if (!demo) notFound();

  const manifest = readManifest(artifact?.manifest);
  const approved = Boolean(demo.approved_at) && demo.generation_status === "approved";
  const inProgress =
    demo.generation_status === "generating" ||
    demo.generation_status === "queued" ||
    demo.deployment_status === "queued" ||
    demo.deployment_status === "deploying";

  return (
    <div className="space-y-6">
      <AutoRefresh active={inProgress} />

      <div>
        <Link
          href="/demos"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All demos
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{demo.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <GenerationBadge status={demo.generation_status} />
              <DeploymentBadge status={demo.deployment_status} />
              <Badge tone="neutral">{titleCase(demo.template_name)}</Badge>
              {demo.approved_at ? (
                <Badge tone="green">Approved {formatRelative(demo.approved_at)}</Badge>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {leadId ? (
              <Link
                href={`/leads/${leadId}`}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
              >
                View source lead
              </Link>
            ) : null}
            {artifact ? (
              <a
                href={`/api/v1/demos/${demo.id}/download`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
              >
                <Download className="size-3.5" aria-hidden="true" />
                Download HTML
              </a>
            ) : null}
            {demo.deployment_url ? (
              <a
                href={demo.deployment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-violet-700"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                Open deployment
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {demo.deployment_error ? (
        <Alert tone="red" title="Last deployment or generation error">
          <p>{demo.deployment_error}</p>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Isolated preview</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Served from a sandboxed route with an opaque origin. The demo cannot read your session or
                  call privileged APIs.
                </p>
              </div>
              <Badge tone="violet">
                <ShieldCheck className="size-3" aria-hidden="true" />
                sandboxed
              </Badge>
            </CardHeader>
            <CardBody>
              {artifact ? (
                <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                  <iframe
                    src={`/api/v1/demos/${demo.id}/preview`}
                    title="Concept demo preview"
                    sandbox="allow-scripts"
                    className="h-[620px] w-full"
                  />
                </div>
              ) : (
                <EmptyState
                  title="No artifact stored yet"
                  description="Generation either has not run or failed. Check the job history and retry."
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-zinc-900">Artifact manifest</h2>
              {artifact ? (
                <span className="font-mono text-[10px] text-zinc-400">{artifact.checksum.slice(0, 16)}…</span>
              ) : null}
            </CardHeader>
            <CardBody>
              {artifact ? (
                <>
                  <DefinitionList
                    items={[
                      { label: "Total size", value: `${formatNumber(artifact.byte_size)} bytes` },
                      { label: "Stored", value: formatRelative(artifact.created_at) },
                      { label: "Template", value: manifest.template ?? demo.template_name },
                      { label: "Files", value: `${manifest.files.length}` },
                    ]}
                  />
                  <ul className="mt-4 divide-y divide-zinc-100 font-mono text-xs">
                    {manifest.files.map((file) => (
                      <li key={file.path} className="flex items-center justify-between gap-3 py-2">
                        <span className="text-zinc-700">{file.path}</span>
                        <span className="text-zinc-400">{formatNumber(file.bytes)} B</span>
                      </li>
                    ))}
                  </ul>
                  {manifest.warnings.length > 0 ? (
                    <div className="mt-4">
                      <Alert tone="amber" title="Validation warnings">
                        <ul className="list-disc pl-4">
                          {manifest.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </Alert>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-zinc-500">No manifest stored.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Deployment history</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  A deployment is only successful when Vercel returns a real URL.
                </p>
              </div>
            </CardHeader>
            <CardBody>
              {deployments.length === 0 ? (
                <p className="text-sm text-zinc-500">No deployment attempts recorded.</p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {deployments.map((deployment) => (
                    <li key={deployment.id} className="py-3 first:pt-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs text-zinc-500">
                          {deployment.vercel_deployment_id?.slice(0, 14) ?? deployment.id.slice(0, 8)}…
                        </span>
                        <span className="text-xs text-zinc-400">{formatDateTime(deployment.created_at)}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge
                          tone={
                            deployment.status === "ready"
                              ? "green"
                              : deployment.status === "error"
                                ? "red"
                                : "amber"
                          }
                        >
                          {titleCase(deployment.status)}
                        </Badge>
                        {deployment.url ? (
                          <a
                            href={deployment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-violet-700 hover:text-violet-900"
                          >
                            {deployment.url}
                          </a>
                        ) : null}
                      </div>
                      {deployment.error_message ? (
                        <p className="mt-1 text-xs text-red-600">{deployment.error_message}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-zinc-900">Approval and deployment</h2>
            </CardHeader>
            <CardBody>
              <DemoActions
                demoId={demo.id}
                generationStatus={demo.generation_status}
                deploymentStatus={demo.deployment_status}
                approved={approved}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-zinc-900">Details</h2>
            </CardHeader>
            <CardBody>
              <DefinitionList
                items={[
                  { label: "Slug", value: <span className="font-mono text-xs">{demo.slug}</span> },
                  { label: "Storage", value: demo.artifact_storage_path ?? "—" },
                  { label: "Approved", value: formatDateTime(demo.approved_at) },
                  { label: "Deployed", value: formatDateTime(demo.deployed_at) },
                  { label: "Vercel project", value: demo.vercel_project_reference ?? "—" },
                  {
                    label: "Live URL",
                    value: demo.deployment_url ? (
                      <a
                        href={demo.deployment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-violet-700 hover:text-violet-900"
                      >
                        {demo.deployment_url}
                      </a>
                    ) : (
                      "Not deployed"
                    ),
                  },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
