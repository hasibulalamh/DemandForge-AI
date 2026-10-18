import type { Metadata } from "next";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Choose a new password</h1>
        <p className="mt-1 text-sm text-zinc-500">Use a strong password for your DemandForge account.</p>
        <NewPasswordForm />
      </section>
    </main>
  );
}
