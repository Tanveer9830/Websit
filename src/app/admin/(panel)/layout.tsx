import type { ReactNode } from "react";
import { getSettings } from "@/lib/settings";
import { brandFromSettings } from "@/lib/brand";
import { requireAdminPage } from "@/lib/page-auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ToastProvider } from "@/components/ui/toast";

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const [auth, settings] = await Promise.all([
    requireAdminPage("/admin"),
    getSettings(),
  ]);
  const brand = brandFromSettings(settings);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#04050d]">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(1000px_500px_at_18%_-10%,rgba(139,92,246,0.09),transparent),radial-gradient(900px_500px_at_100%_100%,rgba(59,130,246,0.06),transparent)]" />
        <AdminSidebar
          brand={brand}
          user={{
            id: auth.user.id,
            username: auth.user.username,
            email: auth.user.email,
            role: auth.user.role,
            permissions: auth.user.permissions,
          }}
          emailVerified={Boolean(auth.user.emailVerifiedAt)}
        />
        <div className="relative lg:pl-[282px]">
          <main className="mx-auto w-full max-w-[1320px] px-4 pb-14 pt-24 sm:px-6 lg:px-8 lg:pt-8">{children}</main>
          <footer className="mx-auto w-full max-w-[1320px] px-4 pb-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2 border-t border-white/7 pt-5 text-[10px] text-muted sm:flex-row sm:items-center sm:justify-between">
              <span>
                {brand.name} administration · all privileged actions are audited
              </span>
              <span className="font-mono text-[9px]">Signed in as {auth.user.username}</span>
            </div>
          </footer>
        </div>
      </div>
    </ToastProvider>
  );
}
