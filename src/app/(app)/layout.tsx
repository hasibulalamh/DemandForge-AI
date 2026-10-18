import { AppShell } from "@/components/shell/app-shell";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { getIntegrationStatus } from "@/lib/env";

// Every protected page depends on the request's session and live workspace data.
export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  const integrations = getIntegrationStatus();

  const warnings: string[] = [];
  if (!integrations.gemini.configured)
    warnings.push("Gemini is not configured — analysis and demos are disabled.");
  if (!integrations.vercel.configured) warnings.push("Vercel is not configured — deployments are disabled.");
  if (!integrations.cron.configured)
    warnings.push("CRON_SECRET is not set — background jobs will not run on schedule.");

  return (
    <AppShell
      displayName={profile?.displayName ?? user.email ?? "Account"}
      email={user.email}
      role={profile?.role ?? "member"}
      warnings={warnings}
    >
      {children}
    </AppShell>
  );
}
