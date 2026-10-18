import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { brandFromSettings } from "@/lib/brand";
import { getPageSession, safeNextPath } from "@/lib/page-auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Member sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const auth = await getPageSession();
  if (auth) {
    if (auth.user.mustChangePassword) redirect("/admin/change-password");
    redirect(auth.user.role === "MEMBER" ? "/dashboard" : "/admin");
  }

  const settings = await getSettings();
  const brand = brandFromSettings(settings);
  const next = safeNextPath(params.next, "/dashboard");
  const notice =
    params.reset === "1" ? "Your password was reset and all sessions were signed out. Sign in with the new password." : undefined;

  return (
    <AuthShell
      brand={brand}
      title="Welcome back."
      subtitle="Sign in to track your applications, update your profile, and pick up where you left off."
      footer={
        <p className="text-center">
          New to {brand.name}?{" "}
          <Link href="/register" className="font-medium text-brand-bright hover:text-white">
            Create a member account
          </Link>
          <span className="mx-2 text-white/15">·</span>
          <Link href="/admin/login" className="text-muted transition hover:text-snow">
            Admin sign-in
          </Link>
        </p>
      }
    >
      <LoginForm next={next} notice={notice} />
    </AuthShell>
  );
}
