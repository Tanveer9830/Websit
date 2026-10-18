import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { brandFromSettings } from "@/lib/brand";
import { getPageSession, safeNextPath } from "@/lib/page-auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Administrator sign in" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const auth = await getPageSession();
  if (auth && (auth.user.role === "OWNER" || auth.user.role === "ADMIN")) {
    redirect(auth.user.mustChangePassword ? "/admin/change-password" : "/admin");
  }

  const settings = await getSettings();
  const brand = brandFromSettings(settings);
  const next = safeNextPath(params.next, "/admin");

  return (
    <AuthShell
      brand={brand}
      variant="admin"
      title="Administrator sign-in."
      subtitle="This area is restricted to the owner and administrators with explicit permissions. Every action is checked on the server."
      footer={
        <div className="space-y-3">
          <p className="text-center">
            Member?{" "}
            <Link href="/login" className="font-medium text-brand-bright hover:text-white">
              Use member sign-in
            </Link>
          </p>
          <p className="text-center">
            <Link href="/" className="text-xs text-muted transition hover:text-snow">
              Return to {brand.name}
            </Link>
          </p>
        </div>
      }
    >
      <div className="space-y-5">
        <Alert tone="warning" title="First install?">
          Sign in with the documented temporary owner credentials, then choose a strong password immediately. The panel
          stays locked until the temporary password is replaced.
        </Alert>
        <LoginForm admin next={next} />
      </div>
    </AuthShell>
  );
}
