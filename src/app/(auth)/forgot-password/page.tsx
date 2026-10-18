import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { brandFromSettings } from "@/lib/brand";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/forgot-form";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  const settings = await getSettings();
  const brand = brandFromSettings(settings);

  return (
    <AuthShell
      brand={brand}
      title="Reset your password."
      subtitle="Enter the email on your account and we'll send a single-use link. For privacy, the response is the same whether or not an account exists."
    >
      <ForgotForm />
    </AuthShell>
  );
}
