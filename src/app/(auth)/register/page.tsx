import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { brandFromSettings } from "@/lib/brand";
import { getPageSession, safeNextPath } from "@/lib/page-auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Create a member account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const auth = await getPageSession();
  if (auth) {
    if (auth.user.mustChangePassword) redirect("/admin/change-password");
    redirect(auth.user.role === "MEMBER" ? "/dashboard" : "/admin");
  }

  const settings = await getSettings();
  const brand = brandFromSettings(settings);
  const next = safeNextPath(params.next, "/apply");

  return (
    <AuthShell
      brand={brand}
      title="Claim your spot."
      subtitle={`Create a free member account, then apply for a ${brand.name} staff role. Your unique member ID is created instantly.`}
      footer={
        <p className="text-center">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-bright hover:text-white">
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}
