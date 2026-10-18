import type { Metadata } from "next";

import { Alert, Badge, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/primitives";
import { TokenManager } from "@/features/settings/components/token-manager";
import { requireUser } from "@/lib/auth";
import { getIntegrationStatus, serverEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  const user = await requireUser();
  const status = getIntegrationStatus();

  const supabase = await createSupabaseServerClient();
  const { data: tokens } = await supabase
    .from("api_tokens")
    .select("id, name, token_prefix, last_used_at, revoked_at, created_at")
    .order("created_at", { ascending: false });

  const integrations = [
    {
      key: "supabase",
      label: "Supabase (Postgres + Auth)",
      description: "Database, Row Level Security, and authentication.",
      status: status.supabase,
    },
    {
      key: "gemini",
      label: `Gemini (${serverEnv.geminiModel})`,
      description: "Requirement extraction and demo design specifications.",
      status: status.gemini,
    },
    {
      key: "vercel",
      label: "Vercel (demo deployments)",
      description: `Deploys approved artifacts into the dedicated project "${serverEnv.vercelProjectName}".`,
      status: status.vercel,
    },
    {
      key: "cron",
      label: "Queue worker secret",
      description: "Authenticates the scheduled worker endpoint that drains the job queue.",
      status: status.cron,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Integrations"
        description="Server-side status only. Secret values are never rendered."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.key}>
            <CardHeader>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">{integration.label}</h2>
                <p className="mt-0.5 text-xs text-zinc-500">{integration.description}</p>
              </div>
              <Badge tone={integration.status.configured ? "green" : "amber"}>
                {integration.status.configured ? "Configured" : "Missing config"}
              </Badge>
            </CardHeader>
            <CardBody>
              {integration.status.configured ? (
                <p className="text-xs text-zinc-500">
                  All required variables are present. Values are not displayed for security.
                </p>
              ) : (
                <div className="text-xs text-zinc-600">
                  <p className="font-medium text-zinc-700">Set these variables:</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 font-mono">
                    {integration.status.missing.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      <Alert tone="violet" title="Where configuration lives">
        <p>
          Add variables to <code className="font-mono text-xs">.env.local</code> for local development and to
          your Vercel project for deployments. See{" "}
          <span className="font-mono text-xs">docs/ENVIRONMENT-VARIABLES.md</span>.
        </p>
      </Alert>

      <Card>
        <CardHeader>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Chrome extension tokens</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Tokens authenticate the extension. Only a SHA-256 hash is stored; the value is shown once.
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <TokenManager tokens={tokens ?? []} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-zinc-900">Installing the extension</h2>
        </CardHeader>
        <CardBody className="space-y-3 text-sm text-zinc-600">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Build the extension: <code className="font-mono text-xs">pnpm build:extension</code>. Output
              goes to <code className="font-mono text-xs">extension/dist</code>.
            </li>
            <li>
              Open <code className="font-mono text-xs">chrome://extensions</code>, enable{" "}
              <strong>Developer mode</strong>, then choose <strong>Load unpacked</strong> and select{" "}
              <code className="font-mono text-xs">extension/dist</code>.
            </li>
            <li>
              Open the extension, set the dashboard URL (for example{" "}
              <code className="font-mono text-xs">http://localhost:3000</code>) and paste a token created
              above.
            </li>
            <li>
              On a page you are authorised to view, click <strong>Capture post from this tab</strong>, review
              the text, then import it. The extension only reads the active tab after your click.
            </li>
          </ol>
          <p className="text-xs text-zinc-500">
            The extension never stores Facebook credentials, never reads cookies, and never runs automatically
            in the background. See <span className="font-mono text-xs">docs/FACEBOOK-DATA-SOURCES.md</span>.
          </p>
        </CardBody>
      </Card>

      <p className="text-xs text-zinc-400">Signed in as {user.email}</p>
    </div>
  );
}
