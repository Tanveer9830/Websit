import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { brandFromSettings } from "@/lib/brand";
import { requireAdminPage } from "@/lib/page-auth";
import { formatDateTime } from "@/lib/format";
import { AdminPasswordForm } from "@/components/admin/admin-password-form";
import { Alert } from "@/components/ui/alert";
import { CopyButton } from "@/components/ui/copy-button";
import { BrandLockup } from "@/components/ui/logo";
import { PageHeader } from "@/components/ui/page-header";
import { ToastProvider } from "@/components/ui/toast";
import { ArrowLeftIcon, KeyIcon, ShieldCheckIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Change password" };

export default async function AdminChangePasswordPage() {
  const [auth, settings] = await Promise.all([
    requireAdminPage("/admin/change-password", { allowPasswordChange: true }),
    getSettings(),
  ]);
  const forced = auth.user.mustChangePassword;
  const isOwner = auth.user.role === "OWNER";
  const brand = brandFromSettings(settings);

  return (
    <ToastProvider>
      <div className="relative min-h-screen bg-[#04050d]">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(1000px_500px_at_20%_-10%,rgba(139,92,246,0.12),transparent),radial-gradient(900px_500px_at_100%_100%,rgba(59,130,246,0.06),transparent)]" />
        <header className="relative border-b border-white/7">
          <div className="mx-auto flex h-[68px] w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href={forced ? "/admin/change-password" : "/admin"} aria-label={`${brand.name} administration`}>
              <BrandLockup brand={brand} subtitle="Administration" />
            </Link>
            {forced ? (
              <span className="badge badge-amber">Locked until changed</span>
            ) : (
              <Link href="/admin" className="btn btn-ghost btn-sm">
                <ArrowLeftIcon size={14} /> Overview
              </Link>
            )}
          </div>
        </header>
        <main className="relative mx-auto w-full max-w-3xl px-4 pb-16 pt-8 sm:px-6">
          <div className="space-y-5">
      {forced ? (
        <Alert tone="warning" title="Temporary password — action required">
          The panel is locked until you replace the password you were given. This applies to the seeded owner and to any
          member promoted to administrator. Sign in again on other devices with the new password.
        </Alert>
      ) : null}

      <PageHeader
        eyebrow="Account security"
        title={forced ? "Replace your temporary password." : "Change your password."}
        description={
          forced
            ? "Choose something unique and strong. You cannot use the default or a commonly breached password."
            : "Rotate your password at any time. Every other active session is revoked when you do."
        }
        actions={
          <Link href="/admin" className="btn btn-secondary">
            <ArrowLeftIcon size={15} />
            Overview
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <section className="card p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-brand/20 bg-brand/10 text-brand-bright">
              <KeyIcon size={16} />
            </span>
            <div>
              <h2 className="font-display text-[15px] font-semibold text-snow">New password</h2>
              <p className="text-[10px] text-muted">Signed in as {auth.user.username}</p>
            </div>
          </div>
          <AdminPasswordForm forced={forced} isOwner={isOwner} />
        </section>

        <aside className="space-y-5">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-display text-[14px] font-semibold text-snow">
              <ShieldCheckIcon size={14} className="text-emerald-300" />
              Your account
            </h2>
            <dl className="mt-3 space-y-2.5 text-[10.5px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Role</dt>
                <dd className="font-medium text-mist">{isOwner ? "Owner" : "Administrator"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Username</dt>
                <dd className="text-mist">{auth.user.username}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Email</dt>
                <dd className="min-w-0 truncate text-right text-mist">{auth.user.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Last sign-in</dt>
                <dd className="text-mist">{formatDateTime(auth.user.lastLoginAt)}</dd>
              </div>
            </dl>
            <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.025] p-3">
              <p className="text-[8.5px] font-semibold uppercase tracking-[0.14em] text-muted">Permanent account ID</p>
              <div className="mt-1 flex items-center gap-1.5">
                <code className="min-w-0 break-all font-mono text-[9.5px] text-mist">{auth.user.id}</code>
                <CopyButton value={auth.user.id} iconOnly label="Copy account ID" />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/8 bg-[linear-gradient(140deg,rgba(139,92,246,0.1),rgba(59,130,246,0.03))] p-5">
            <p className="text-[10.5px] leading-relaxed text-mist">
              <span className="font-semibold text-snow">Locked out later?</span> Administrators and the owner can use
              the password reset link on the sign-in page. If email delivery is unavailable, the server owner can run the
              documented owner recovery command with CLI access.
            </p>
          </section>
        </aside>
          </div>
        </div>
        </main>
      </div>
    </ToastProvider>
  );
}
