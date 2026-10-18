import "server-only";

import { recordAudit } from "@/lib/audit";
import { validateDemoFiles } from "@/lib/demo/validate";
import { sanitizeJobError, NonRetryableJobError, parseJobPayload } from "../types";
import { createVercelService, VercelError } from "@/lib/vercel/client";
import type { JobContext } from "../context";

export async function handleDeployDemo({ job, admin }: JobContext): Promise<void> {
  const { demoId, deploymentId } = parseJobPayload("deploy_demo", job.payload);

  const { data: demo, error } = await admin
    .from("demo_projects")
    .select("id, lead_id, title, generation_status, approved_at, deployment_url")
    .eq("id", demoId)
    .eq("user_id", job.user_id)
    .maybeSingle();

  if (error) throw new Error("Could not load the demo project.");
  if (!demo) throw new NonRetryableJobError("Demo project not found.");
  if (!demo.approved_at || demo.generation_status !== "approved") {
    throw new NonRetryableJobError("Only an approved demo can be deployed.");
  }

  const { data: artifact } = await admin
    .from("demo_artifacts")
    .select("files")
    .eq("demo_id", demo.id)
    .maybeSingle();

  if (!artifact) throw new NonRetryableJobError("No generated artifact exists for this demo.");

  // Defence in depth: validate again immediately before upload.
  const validation = validateDemoFiles(artifact.files);
  if (!validation.valid || !validation.files) {
    throw new NonRetryableJobError(
      `Artifact failed validation before deployment: ${validation.errors.slice(0, 2).join(" ")}`,
    );
  }

  const { data: deployment } = await admin
    .from("deployments")
    .select("id, vercel_deployment_id, status")
    .eq("id", deploymentId)
    .eq("demo_project_id", demo.id)
    .eq("user_id", job.user_id)
    .maybeSingle();

  if (!deployment) throw new NonRetryableJobError("Deployment record not found.");

  const service = createVercelService();
  if (!service.isConfigured()) {
    const message = "Vercel is not configured. Set VERCEL_TOKEN and VERCEL_PROJECT_ID.";
    await admin
      .from("deployments")
      .update({ status: "error", error_message: message, completed_at: new Date().toISOString() })
      .eq("id", deployment.id);
    await admin
      .from("demo_projects")
      .update({ deployment_status: "failed", deployment_error: message })
      .eq("id", demo.id);
    throw new NonRetryableJobError(message);
  }

  await admin.from("deployments").update({ status: "building" }).eq("id", deployment.id);
  await admin
    .from("demo_projects")
    .update({ deployment_status: "deploying", deployment_error: null })
    .eq("id", demo.id);

  try {
    let vercelId = deployment.vercel_deployment_id;

    // If a previous attempt already created a deployment, poll it instead of
    // creating a duplicate build.
    if (!vercelId) {
      const created = await service.createDeployment({
        demoId: demo.id,
        files: validation.files,
      });
      vercelId = created.id;

      await admin
        .from("deployments")
        .update({
          vercel_deployment_id: created.id,
          vercel_project_reference: created.projectId,
          url: created.url,
          status: "building",
        })
        .eq("id", deployment.id);

      await admin
        .from("demo_projects")
        .update({ vercel_project_reference: created.projectId })
        .eq("id", demo.id);
    }

    const ready = await service.waitForReady(vercelId, { timeoutMs: 90_000, intervalMs: 4_000 });
    const now = new Date().toISOString();

    await admin
      .from("deployments")
      .update({ status: "ready", url: ready.url, error_message: null, completed_at: now })
      .eq("id", deployment.id);

    await admin
      .from("demo_projects")
      .update({
        deployment_status: "deployed",
        deployment_url: ready.url,
        deployed_at: now,
        deployment_error: null,
      })
      .eq("id", demo.id);

    await admin
      .from("leads")
      .update({ pipeline_status: "deployed" })
      .eq("id", demo.lead_id)
      .eq("user_id", job.user_id)
      .in("pipeline_status", ["shortlisted", "demo_generated"]);

    await recordAudit(admin, {
      userId: job.user_id,
      actorType: "worker",
      action: "deployment.ready",
      entityType: "demo_project",
      entityId: demo.id,
      metadata: {
        deploymentId: deployment.id,
        vercelDeploymentId: vercelId,
        url: ready.url,
        jobId: job.id,
      },
    });
  } catch (caught) {
    const message = sanitizeJobError(caught);
    const now = new Date().toISOString();

    await admin
      .from("deployments")
      .update({
        status: caught instanceof VercelError && caught.code === "timeout" ? "building" : "error",
        error_message: message,
        completed_at: now,
      })
      .eq("id", deployment.id);

    await admin
      .from("demo_projects")
      .update({ deployment_status: "failed", deployment_error: message })
      .eq("id", demo.id);

    await recordAudit(admin, {
      userId: job.user_id,
      actorType: "worker",
      action: "deployment.failed",
      entityType: "demo_project",
      entityId: demo.id,
      metadata: { error: message, jobId: job.id },
    });

    throw caught;
  }
}
