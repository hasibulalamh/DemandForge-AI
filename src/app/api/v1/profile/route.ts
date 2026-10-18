import type { NextRequest } from "next/server";

import { jsonOk, safeRoute } from "@/lib/api/errors";
import { assertRateLimit } from "@/lib/api/rate-limit";
import { requireApiUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateProfileSchema } from "@/lib/validation/schemas";

export async function PATCH(request: NextRequest) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`profile:update:${user.id}`, 20, 60_000);

    const body = updateProfileSchema.parse(await request.json());
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({ display_name: body.displayName })
      .eq("id", user.id)
      .select("id, display_name, role")
      .single();

    if (error) throw new Error("Could not update the profile.");
    return jsonOk(data);
  });
}

/**
 * Irreversible account deletion. Cascades to every owned row (leads, demos,
 * sources, jobs, usage) via foreign keys. Requires an explicit confirmation
 * string in the request body to avoid accidental calls.
 */
export async function DELETE(request: NextRequest) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`profile:delete:${user.id}`, 3, 60_000);

    const body = (await request.json().catch(() => ({}))) as { confirm?: string };
    if (body.confirm !== "DELETE") {
      return jsonOk({ deleted: false, reason: "Confirmation string missing." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw new Error("Could not delete the account.");

    return jsonOk({ deleted: true });
  });
}
