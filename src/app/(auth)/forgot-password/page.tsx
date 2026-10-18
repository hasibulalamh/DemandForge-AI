import type { Metadata } from "next";
import { PasswordResetRequestForm } from "./password-reset-request-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Reset your password</h1>
        <p className="mt-1 text-sm text-zinc-500">We will email a secure reset link if the account exists.</p>
        <PasswordResetRequestForm />
      </section>
    </main>
  );
}
