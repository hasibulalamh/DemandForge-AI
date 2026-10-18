import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") === "/reset-password" ? "/reset-password" : "/login";
  const redirectUrl = new URL(next, request.url);

  if (!code) {
    redirectUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    redirectUrl.searchParams.set("error", "invalid_or_expired_link");
    return NextResponse.redirect(redirectUrl);
  }

  const { data } = await supabase.auth.getUser();
  if (data.user && next === "/login") {
    await createSupabaseAdminClient().rpc("claim_initial_owner", { p_user_id: data.user.id });
    redirectUrl.searchParams.set("verified", "1");
  }
  return NextResponse.redirect(redirectUrl);
}
