import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { brandFromSettings } from "@/lib/brand";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const settings = await getSettings();
  const brand = brandFromSettings(settings);

  return (
    <AuthShell
      brand={brand}
      title="Choose a new password."
      subtitle="Make it memorable to you and hard to guess. Resetting signs out every other session on your account."
    >
      <ResetForm token={params.token} />
    </AuthShell>
  );
}
