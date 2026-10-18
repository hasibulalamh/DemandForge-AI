import "server-only";

import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { cache } from "react";

import { assertSameOrigin } from "@/lib/api/origin";
import { unauthorized } from "@/lib/api/errors";
import { isSupabaseConfigured } from "@/lib/public-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface UserProfile {
  id: string;
  displayName: string;
  role: UserRole;
}

export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
});

export const getCurrentProfile = cache(async (): Promise<UserProfile | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) {
    return { id: user.id, displayName: user.email?.split("@")[0] ?? "Account", role: "member" };
  }
  return { id: data.id, displayName: data.display_name || user.email || "Account", role: data.role };
});

/** Page guard: sends unauthenticated visitors to the login screen. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return user;
}

/** Route-handler guard: same-origin cookie auth + authenticated Supabase user. */
export async function requireApiUser(request: NextRequest): Promise<AuthUser> {
  assertSameOrigin(request);
  const user = await getAuthUser();
  if (!user) throw unauthorized();
  return user;
}

/**
 * Single-owner initialization check. Public sign-up is allowed only until the
 * first confirmed owner account exists. This must not be the only gate: the Supabase
 * project auth setting and the app layer must also refuse new sign-ups after init.
 */
export async function isWorkspaceInitialized(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("is_workspace_initialized");
  if (error) return false;
  return data;
}

/**
 * Returns whether a confirmed owner currently exists. Used to decide whether the
 * one-time setup flow should still be reachable.
 */
export async function hasOwnerProfile(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner");

  return Boolean(count && count > 0);
}
