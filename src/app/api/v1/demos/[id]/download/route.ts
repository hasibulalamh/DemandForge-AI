import type { NextRequest } from "next/server";
import { z } from "zod";

import { notFound, safeRoute } from "@/lib/api/errors";
import { assertRateLimit } from "@/lib/api/rate-limit";
import { requireApiUser } from "@/lib/auth";
import { buildPreviewDocument } from "@/lib/demo/preview";
import { validateDemoFiles } from "@/lib/demo/validate";
import { getDemoArtifactFiles } from "@/features/demos/queries";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`demos:download:${user.id}`, 30, 60_000);

    const { id } = paramsSchema.parse(await context.params);
    const artifact = await getDemoArtifactFiles(id);
    if (!artifact) throw notFound("Demo artifact");

    const validation = validateDemoFiles(artifact.files);
    if (!validation.valid || !validation.files) {
      return new Response("This demo artifact did not pass safety validation.", { status: 422 });
    }

    return new Response(buildPreviewDocument(validation.files), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="demandforge-concept-${id}.html"`,
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
