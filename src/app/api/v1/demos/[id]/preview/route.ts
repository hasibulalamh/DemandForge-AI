import type { NextRequest } from "next/server";
import { z } from "zod";

import { notFound, safeRoute } from "@/lib/api/errors";
import { assertRateLimit } from "@/lib/api/rate-limit";
import { requireApiUser } from "@/lib/auth";
import { buildPreviewDocument, PREVIEW_CSP } from "@/lib/demo/preview";
import { validateDemoFiles } from "@/lib/demo/validate";
import { getDemoArtifactFiles } from "@/features/demos/queries";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`demos:preview:${user.id}`, 120, 60_000);

    const { id } = paramsSchema.parse(await context.params);
    const artifact = await getDemoArtifactFiles(id);
    if (!artifact) throw notFound("Demo artifact");

    const validation = validateDemoFiles(artifact.files);
    if (!validation.valid || !validation.files) {
      return new Response("This demo artifact did not pass safety validation.", {
        status: 422,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    return new Response(buildPreviewDocument(validation.files), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": PREVIEW_CSP,
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  });
}
