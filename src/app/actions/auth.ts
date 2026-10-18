"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/public-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isWorkspaceInitialized } from "@/lib/auth";

export interface AuthState {
  error?: string;
  message?: string;
}

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(320),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
});

const otpEmailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(320),
});

const otpCodeSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(320),
  code: z.string().trim().min(1, "Enter the email code.").max(10),
});

const setupSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(320),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
  displayName: z.string().trim().max(120).optional(),
  setupSecret: z.string().min(1, "Enter the setup secret."),
});

const resetEmailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(320),
});

const newPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
});

function matchesSetupSecret(value: string): boolean {
  const expected = Buffer.from(serverEnv.ownerSetupSecret);
  const actual = Buffer.from(value);
  return expected.length > 0 && expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function signInAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. Add the public Supabase variables to .env.local." };
  }
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid credentials." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Invalid email or password." };
  }

  redirect("/dashboard");
}

export async function sendOtpAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. Add the public Supabase variables to .env.local." };
  }

  const parsed = otpEmailSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email address." };
  }

  // OTP-based login is enabled at the Supabase project level. If it is configured
  // there, the server tries to send the one-time code/link and then shows the
  // verification field. If OTP is not enabled, the error is surfaced to the UI.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`,
    },
  });

  if (error) {
    return { error: error.message.slice(0, 200) };
  }

  return {
    message:
      "If that email is registered, a one-time sign-in code or link has been sent. Enter the code below.",
  };
}

export async function verifyOtpAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. Add the public Supabase variables to .env.local." };
  }

  const parsed = otpCodeSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid code." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.code,
    type: "email",
  });

  if (error) {
    return { error: "Invalid or expired email code. Try sending a new one." };
  }

  redirect("/dashboard");
}

export async function setupOwnerAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. Add the public Supabase variables to .env.local." };
  }
  if (!serverEnv.ownerSetupSecret) {
    return { error: "Owner setup is disabled until OWNER_SETUP_SECRET is configured on the server." };
  }

  // Only reachable before the workspace is initialized.
  const initialized = await isWorkspaceInitialized();
  if (initialized) {
    return { error: "The workspace is already initialized. Sign in instead." };
  }

  const parsed = setupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
    setupSecret: formData.get("setupSecret"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid account details." };
  }
  if (!matchesSetupSecret(parsed.data.setupSecret)) {
    return { error: "The setup secret is invalid." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.displayName?.slice(0, 120) || parsed.data.email.split("@")[0],
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback?next=/login`,
    },
  });

  if (error || !data.user) {
    return { error: error?.message?.slice(0, 200) ?? "Unable to create the setup account." };
  }

  const admin = createSupabaseAdminClient();
  const { data: registered, error: registerError } = await admin.rpc("register_owner_setup_claim", {
    p_user_id: data.user.id,
  });
  if (registerError || !registered) {
    return { error: "The workspace setup could not be reserved. No account was initialized." };
  }

  if (!data.session) {
    return { message: "Check your email to confirm your account, then sign in." };
  }

  await admin.rpc("claim_initial_owner", { p_user_id: data.user.id });
  return { message: "Account created. Check your email to confirm, then sign in." };
}

export async function sendPasswordResetAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured." };
  const parsed = resetEmailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid email address." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback?next=/reset-password`,
  });
  if (error) return { error: "Unable to send the password reset email." };
  return { message: "If that email is registered, a password reset link has been sent." };
}

export async function updatePasswordAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = newPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid password." };
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Your reset link is invalid or expired." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Unable to update the password." };
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
