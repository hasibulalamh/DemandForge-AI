import type { Metadata } from "next";
import {
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  DefinitionList,
  PageHeader,
} from "@/components/ui/primitives";
import { DangerZone, ProfileForm } from "@/features/settings/components/profile-form";
import { getCurrentProfile, requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Profile, integrations, and account lifecycle. Credentials never appear in the browser."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-zinc-900">Profile</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <ProfileForm displayName={profile?.displayName ?? ""} />
            <DefinitionList
              items={[
                { label: "Email", value: user.email ?? "—" },
                { label: "Role", value: profile?.role ?? "member" },
                { label: "Account id", value: <span className="font-mono text-xs">{user.id}</span> },
                { label: "Workspace", value: "Single-workspace owner/member roles" },
              ]}
            />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-zinc-900">Integrations and usage</h2>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-zinc-600">
              <p>
                Configure Supabase, Gemini, Vercel, and the queue worker secret in{" "}
                <code className="font-mono text-xs">.env.local</code>. This page reports what is present
                without revealing values.
              </p>
              <div className="flex flex-wrap gap-2">
                <ButtonLink href="/settings/integrations" variant="secondary">
                  Integration status
                </ButtonLink>
                <ButtonLink href="/settings/usage" variant="secondary">
                  AI usage
                </ButtonLink>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-zinc-900">Compliance notes</h2>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-zinc-600">
              <p>
                DemandForge imports only content you are authorised to view. It does not bypass logins,
                private group restrictions, CAPTCHAs, or rate limits.
              </p>
              <p>
                Read <span className="font-mono text-xs">docs/FACEBOOK-DATA-SOURCES.md</span> for the
                documented collection matrix.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      <Card className="border-red-200">
        <CardHeader>
          <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
        </CardHeader>
        <CardBody>
          <DangerZone />
        </CardBody>
      </Card>
    </div>
  );
}
