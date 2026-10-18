import { Badge } from "@/components/ui/primitives";
import { titleCase } from "@/lib/utils";

type Tone = "neutral" | "violet" | "green" | "amber" | "red" | "blue" | "zinc";

const ANALYSIS: Record<string, Tone> = {
  pending: "neutral",
  queued: "amber",
  analyzing: "amber",
  analyzed: "green",
  failed: "red",
};

const PIPELINE: Record<string, Tone> = {
  new: "blue",
  shortlisted: "violet",
  rejected: "zinc",
  demo_generated: "amber",
  deployed: "green",
  contacted: "amber",
  replied: "green",
  won: "green",
  lost: "red",
  archived: "zinc",
};

const GENERATION: Record<string, Tone> = {
  draft: "neutral",
  queued: "amber",
  generating: "amber",
  ready: "violet",
  approved: "green",
  failed: "red",
};

const DEPLOYMENT: Record<string, Tone> = {
  not_deployed: "neutral",
  queued: "amber",
  deploying: "amber",
  deployed: "green",
  failed: "red",
};

const JOB: Record<string, Tone> = {
  queued: "amber",
  running: "blue",
  succeeded: "green",
  failed: "red",
  canceled: "zinc",
};

const OUTREACH: Record<string, Tone> = {
  draft: "neutral",
  ready: "violet",
  sent: "blue",
  replied: "green",
  no_response: "amber",
  converted: "green",
  archived: "zinc",
};

const BUDGET: Record<string, Tone> = {
  unknown: "zinc",
  unclear: "neutral",
  stated: "green",
  range: "blue",
};

const SIGNAL: Record<string, Tone> = {
  unknown: "zinc",
  low: "neutral",
  medium: "amber",
  high: "green",
};

function statusBadge(value: string, map: Record<string, Tone>, label?: string) {
  return <Badge tone={map[value] ?? "neutral"}>{label ?? titleCase(value)}</Badge>;
}

export const AnalysisBadge = ({ status }: { status: string }) => statusBadge(status, ANALYSIS);
export const PipelineBadge = ({ status }: { status: string }) => statusBadge(status, PIPELINE);
export const GenerationBadge = ({ status }: { status: string }) => statusBadge(status, GENERATION);
export const DeploymentBadge = ({ status }: { status: string }) => statusBadge(status, DEPLOYMENT);
export const JobBadge = ({ status }: { status: string }) => statusBadge(status, JOB);
export const OutreachBadge = ({ status }: { status: string }) => statusBadge(status, OUTREACH);
export const BudgetBadge = ({ status }: { status: string }) => statusBadge(status, BUDGET);
export const SignalBadge = ({ level }: { level: string }) => statusBadge(level, SIGNAL, titleCase(level));

export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <Badge tone="zinc">Unscored</Badge>;
  const tone: Tone = score >= 70 ? "green" : score >= 40 ? "amber" : "neutral";
  return <Badge tone={tone}>{score}/100</Badge>;
}
