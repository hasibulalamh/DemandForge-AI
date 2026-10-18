import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { AutoRefresh } from "@/components/auto-refresh";
import {
  AnalysisBadge,
  BudgetBadge,
  DeploymentBadge,
  GenerationBadge,
  JobBadge,
  PipelineBadge,
  ScoreBadge,
  SignalBadge,
} from "@/components/status-badges";
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  DefinitionList,
  EmptyState,
} from "@/components/ui/primitives";
import { CreateDemoForm } from "@/features/demo-studio/create-demo-form";
import { AnalyzeButton } from "@/features/leads/components/analyze-button";
import { OutreachComposer } from "@/features/leads/components/outreach-composer";
import { PipelineSelect } from "@/features/leads/components/pipeline-select";
import { parseEvidence, parseFeatures } from "@/features/leads/evidence";
import { getLeadDetail } from "@/features/leads/queries";
import { formatDateTime, formatMoney, formatRelative, titleCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Lead detail" };

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { lead, demos, outreach, jobs } = await getLeadDetail(id);
  if (!lead) notFound();

  const evidence = parseEvidence(lead.evidence);
  const requiredFeatures = parseFeatures(lead.required_features);
  const suggestedFeatures = parseFeatures(lead.suggested_features);
  const technology = parseFeatures(lead.technology_preferences);
  const activeJob = jobs.some((job) => job.status === "queued" || job.status === "running");
  const analysisRunning = lead.analysis_status === "queued" || lead.analysis_status === "analyzing";

  const budgetLabel = (() => {
    if (lead.budget_status === "stated" || lead.budget_status === "range") {
      if (lead.budget_amount && lead.budget_currency) {
        return formatMoney(Number(lead.budget_amount), lead.budget_currency);
      }
      return "Not enough detail";
    }
    return lead.budget_status === "unclear" ? "Unclear" : "Unknown";
  })();

  const outreachDraft = `Hi! I saw your post about ${
    lead.project_title ?? "your project"
  }.\n\nI put together a quick concept of how the ${
    lead.project_category ?? "site"
  } could look and work. Happy to share it if it is useful — no obligation.`;

  return (
    <div className="space-y-6">
      <AutoRefresh active={analysisRunning || activeJob} />

      <div>
        <Link
          href="/leads"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All leads
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {lead.project_title ?? "Untitled request"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <AnalysisBadge status={lead.analysis_status} />
              <PipelineBadge status={lead.pipeline_status} />
              <ScoreBadge score={lead.lead_score} />
              {lead.project_category ? <Badge tone="violet">{titleCase(lead.project_category)}</Badge> : null}
              <span className="text-xs text-zinc-500">Imported {formatRelative(lead.created_at)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {lead.canonical_url ? (
              <a
                href={lead.canonical_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                Open original source
              </a>
            ) : (
              <span className="text-xs text-zinc-400">No source URL recorded</span>
            )}
          </div>
        </div>
      </div>

      {lead.analysis_status === "failed" ? (
        <Alert tone="red" title="The last analysis attempt failed">
          <p>{jobs[0]?.last_error ?? "Check the job history below and retry when the cause is resolved."}</p>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-zinc-900">Original request</h2>
              <span className="font-mono text-[10px] text-zinc-400">
                hash {lead.normalized_content_hash.slice(0, 12)}…
              </span>
            </CardHeader>
            <CardBody>
              <blockquote className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-sm whitespace-pre-wrap text-zinc-700">
                {lead.original_text}
              </blockquote>
              <div className="mt-4">
                <DefinitionList
                  items={[
                    { label: "Source URL", value: lead.canonical_url ?? "Not provided" },
                    { label: "Published", value: formatDateTime(lead.published_at) },
                    { label: "Imported", value: formatDateTime(lead.created_at) },
                    {
                      label: "External reference",
                      value: lead.external_reference ?? "—",
                    },
                  ]}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Extracted requirements</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Every item keeps the quote it was derived from.
                </p>
              </div>
              {evidence.demoTemplate ? <Badge tone="violet">{evidence.demoTemplate}</Badge> : null}
            </CardHeader>
            <CardBody className="space-y-5">
              {requiredFeatures.length === 0 && suggestedFeatures.length === 0 && technology.length === 0 ? (
                <EmptyState
                  title="No analysis yet"
                  description="Run Gemini analysis to extract requirements, evidence, and a transparent score."
                />
              ) : (
                <>
                  <div>
                    <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                      Required features
                    </h3>
                    {requiredFeatures.length === 0 ? (
                      <p className="text-sm text-zinc-500">None were stated in the post.</p>
                    ) : (
                      <ul className="space-y-2">
                        {requiredFeatures.map((feature) => (
                          <li key={feature.name} className="rounded-lg border border-zinc-100 p-3">
                            <p className="text-sm font-medium text-zinc-900">{feature.name}</p>
                            {feature.detail ? (
                              <p className="mt-1 border-l-2 border-violet-200 pl-2 text-xs text-zinc-500 italic">
                                “{feature.detail}”
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {suggestedFeatures.length > 0 ? (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                        Suggested extras (not requested)
                      </h3>
                      <ul className="space-y-2">
                        {suggestedFeatures.map((feature) => (
                          <li key={feature.name} className="text-sm text-zinc-700">
                            <span className="font-medium">{feature.name}</span>
                            {feature.detail ? (
                              <span className="text-zinc-500"> — {feature.detail}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {technology.length > 0 ? (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                        Technology preferences
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {technology.map((item) => (
                          <Badge key={item.name} tone="blue">
                            {item.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Score transparency</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Deterministic weights — the model supplies signals, the score is computed here.
                </p>
              </div>
              <ScoreBadge score={lead.lead_score} />
            </CardHeader>
            <CardBody className="space-y-4">
              {evidence.scoreBreakdown ? (
                <>
                  <ul className="space-y-2">
                    {Object.entries(evidence.scoreBreakdown.factors).map(([factor, points]) => {
                      const max = evidence.scoreBreakdown?.max[factor] ?? 0;
                      const percent = max > 0 ? Math.round((points / max) * 100) : 0;
                      return (
                        <li key={factor}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-medium text-zinc-700">{titleCase(factor)}</span>
                            <span className="text-zinc-500">
                              {points}/{max}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-violet-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <details className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
                    <summary className="cursor-pointer font-medium text-zinc-700">Why this score</summary>
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                      {evidence.scoreBreakdown.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </details>
                </>
              ) : (
                <p className="text-sm text-zinc-500">The score breakdown appears after the first analysis.</p>
              )}

              {evidence.quotes.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    Evidence quotes
                  </h3>
                  <ul className="space-y-2">
                    {evidence.quotes.map((quote) => (
                      <li
                        key={`${quote.claim}-${quote.quote}`}
                        className="rounded-lg border border-zinc-100 p-3"
                      >
                        <p className="text-xs font-medium text-zinc-700">{quote.claim}</p>
                        <p className="mt-1 border-l-2 border-violet-200 pl-2 text-xs text-zinc-500 italic">
                          “{quote.quote}”
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {evidence.suggestedNextAction ? (
                <Alert tone="violet" title="Suggested next action">
                  <p>{evidence.suggestedNextAction}</p>
                  {evidence.demoScope ? (
                    <p className="text-xs opacity-80">Demo scope: {evidence.demoScope}</p>
                  ) : null}
                </Alert>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Demo projects</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Generated concepts must be approved before any deployment.
                </p>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {demos.length > 0 ? (
                <ul className="divide-y divide-zinc-100">
                  {demos.map((demo) => (
                    <li
                      key={demo.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/demos/${demo.id}`}
                          className="text-sm font-medium text-zinc-900 hover:text-violet-700"
                        >
                          {demo.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {demo.template_name} · updated {formatRelative(demo.updated_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <GenerationBadge status={demo.generation_status} />
                        <DeploymentBadge status={demo.deployment_status} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">No demo generated for this lead yet.</p>
              )}

              {lead.analysis_status === "analyzed" ? (
                <div className="rounded-lg border border-zinc-100 p-4">
                  <CreateDemoForm
                    leadId={lead.id}
                    defaultTitle={`${lead.project_title ?? "Website"} — concept site`}
                    variant="card"
                  />
                </div>
              ) : (
                <Alert tone="amber" title="Analysis required">
                  <p>Run the Gemini analysis first so the demo is based on extracted requirements.</p>
                </Alert>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Outreach</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Drafts only. DemandForge never sends messages or posts on your behalf.
                </p>
              </div>
            </CardHeader>
            <CardBody className="space-y-5">
              <OutreachComposer
                leadId={lead.id}
                demos={demos.map((demo) => ({ id: demo.id, title: demo.title }))}
                defaultContent={outreachDraft}
              />

              {outreach.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    Saved drafts
                  </h3>
                  <ul className="space-y-2">
                    {outreach.map((record) => (
                      <li key={record.id} className="rounded-lg border border-zinc-100 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge tone="neutral">{titleCase(record.channel)}</Badge>
                          <Badge tone="violet">{titleCase(record.status)}</Badge>
                        </div>
                        <p className="mt-2 text-xs whitespace-pre-wrap text-zinc-600">
                          {record.draft_content}
                        </p>
                        <p className="mt-2 text-[10px] text-zinc-400">
                          created {formatRelative(record.created_at)}
                          {record.sent_at ? ` · sent ${formatRelative(record.sent_at)}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/outreach"
                    className="mt-2 inline-block text-xs font-medium text-violet-700 hover:text-violet-900"
                  >
                    Manage outreach status
                  </Link>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-zinc-900">Actions</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <AnalyzeButton leadId={lead.id} analysisStatus={lead.analysis_status} />
              <PipelineSelect leadId={lead.id} value={lead.pipeline_status} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-zinc-900">Signals</h2>
            </CardHeader>
            <CardBody>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-zinc-500">Budget</dt>
                  <dd className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900">{budgetLabel}</span>
                    <BudgetBadge status={lead.budget_status} />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-zinc-500">Urgency</dt>
                  <dd>
                    <SignalBadge level={lead.urgency} />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-zinc-500">Hiring intent</dt>
                  <dd>
                    <SignalBadge level={lead.hiring_intent} />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-zinc-500">Requirements clarity</dt>
                  <dd className="font-medium text-zinc-900">
                    {lead.requirements_clarity !== null ? `${lead.requirements_clarity}/100` : "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-zinc-500">Extraction confidence</dt>
                  <dd className="font-medium text-zinc-900">
                    {lead.confidence_score !== null ? `${lead.confidence_score}/100` : "—"}
                  </dd>
                </div>
              </dl>

              {evidence.budgetQuote || evidence.urgencyQuote || evidence.hiringIntentQuote ? (
                <div className="mt-4 space-y-2 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
                  {evidence.budgetQuote ? <p>Budget: “{evidence.budgetQuote}”</p> : null}
                  {evidence.urgencyQuote ? <p>Timing: “{evidence.urgencyQuote}”</p> : null}
                  {evidence.hiringIntentQuote ? <p>Intent: “{evidence.hiringIntentQuote}”</p> : null}
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-zinc-900">Job history</h2>
            </CardHeader>
            <CardBody>
              {jobs.length === 0 ? (
                <p className="text-sm text-zinc-500">No background jobs for this lead yet.</p>
              ) : (
                <ul className="space-y-3">
                  {jobs.map((job) => (
                    <li key={job.id} className="rounded-lg border border-zinc-100 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-zinc-700">{titleCase(job.job_type)}</span>
                        <JobBadge status={job.status} />
                      </div>
                      <p className="mt-1 text-[10px] text-zinc-400">
                        attempt {job.attempt_count}/{job.max_attempts} · {formatRelative(job.updated_at)}
                      </p>
                      {job.last_error ? <p className="mt-1 text-xs text-red-600">{job.last_error}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
