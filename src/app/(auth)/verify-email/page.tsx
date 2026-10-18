import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { brandFromSettings } from "@/lib/brand";
import { getPageSession } from "@/lib/page-auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyPanel } from "@/components/auth/verify-panel";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const [settings, auth] = await Promise.all([getSettings(), getPageSession()]);
  const brand = brandFromSettings(settings);

  return (
    <AuthShell
      brand={brand}
      title="One click to confirm."
      subtitle="Verifying proves the email on your account belongs to you. It also keeps password recovery working when you need it."
    >
      <VerifyPanel token={params.token} signedIn={Boolean(auth)} />
    </AuthShell>
  );
}
