import "server-only";

import { recordAudit } from "@/lib/audit";
import { validateDemoFiles } from "@/lib/demo/validate";
import { renderDemo } from "@/lib/demo/render";
import { isGeminiConfigured } from "@/lib/env";
import { generateDemoSpecification } from "@/lib/gemini/demo-spec";
import { createGeminiForUser } from "@/lib/gemini/service";
import { GeminiError } from "@/lib/gemini/types";
import type { Json } from "@/types/database";
import type { JobContext } from "../context";
import { NonRetryableJobError, parseJobPayload } from "../types";

function featureNames(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "object" && item !== null && !Array.isArray(item) ? item.name : null))
    .filter((name): name is string => typeof name === "string");
}

export async function handleGenerateDemo({ job, admin }: JobContext): Promise<void> {
  const { demoId } = parseJobPayload("generate_demo", job.payload);

  const { data: demo, error } = await admin
    .from("demo_projects")
    .select("id, lead_id, title, template_name, generation_status")
    .eq("id", demoId)
    .eq("user_id", job.user_id)
    .maybeSingle();

  if (error) throw new Error("Could not load the demo project.");
  if (!demo) throw new NonRetryableJobError("Demo project not found.");

  const { data: lead } = await admin
    .from("leads")
    .select(
      "id, project_category, project_title, project_summary, required_features, suggested_features, technology_preferences",
    )
    .eq("id", demo.lead_id)
    .eq("user_id", job.user_id)
    .maybeSingle();

  if (!lead) throw new NonRetryableJobError("The demo's lead no longer exists.");

  await admin
    .from("demo_projects")
    .update({ generation_status: "generating", deployment_error: null })
    .eq("id", demo.id);

  if (!isGeminiConfigured()) {
    await admin
      .from("demo_projects")
      .update({
        generation_status: "failed",
        deployment_error: "Gemini is not configured. Set GEMINI_API_KEY.",
      })
      .eq("id", demo.id);
    throw new NonRetryableJobError("Gemini is not configured. Set GEMINI_API_KEY.");
  }

  const { client, recordUsage, model } = createGeminiForUser(job.user_id);

  try {
    const { spec, usage } = await generateDemoSpecification(
      {
        category: lead.project_category ?? "web development",
        title: lead.project_title ?? demo.title,
        summary: lead.project_summary ?? "",
        requiredFeatures: featureNames(lead.required_features),
        suggestedFeatures: featureNames(lead.suggested_features),
        technologyPreferences: featureNames(lead.technology_preferences),
        templateName: demo.template_name,
      },
      client,
    );

    await recordUsage({
      operation: "demo_specification",
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      status: "success",
    });

    const { files, manifest } = renderDemo(spec, { templateName: demo.template_name });
    const validation = validateDemoFiles(files);

    if (!validation.valid || !validation.files) {
      throw new NonRetryableJobError(
        `Generated demo failed safety validation: ${validation.errors.slice(0, 2).join(" ")}`,
      );
    }

    const byteSize = Buffer.byteLength(Object.values(files).join(""), "utf8");

    const { error: artifactError } = await admin.from("demo_artifacts").upsert(
      {
        demo_id: demo.id,
        files: files as unknown as Json,
        manifest: manifest as unknown as Json,
        byte_size: byteSize,
        checksum: manifest.checksum,
      },
      { onConflict: "demo_id" },
    );

    if (artifactError) throw new Error("Could not store the generated artifact.");

    const { error: demoError } = await admin
      .from("demo_projects")
      .update({
        generation_status: "ready",
        template_name: demo.template_name,
        artifact_storage_path: `db://demo_artifacts/${demo.id}`,
        preview_url: `/demos/${demo.id}`,
        approved_at: null,
        deployment_error: null,
      })
      .eq("id", demo.id);

    if (demoError) throw new Error("Could not update the demo project.");

    await recordAudit(admin, {
      userId: job.user_id,
      actorType: "worker",
      action: "demo.generated",
      entityType: "demo_project",
      entityId: demo.id,
      metadata: { template: demo.template_name, bytes: byteSize, jobId: job.id },
    });
  } catch (caught) {
    await recordUsage({
      operation: "demo_specification",
      model,
      inputTokens: 0,
      outputTokens: 0,
      status: "error",
      errorCode: caught instanceof GeminiError ? caught.code : "unknown",
    });

    await admin
      .from("demo_projects")
      .update({
        generation_status: "failed",
        deployment_error:
          caught instanceof NonRetryableJobError
            ? caught.message.slice(0, 500)
            : "Demo generation failed. It will be retried if attempts remain.",
      })
      .eq("id", demo.id);

    throw caught;
  }
}
