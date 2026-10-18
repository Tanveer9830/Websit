import type { ReactNode } from "react";
import { getSettings } from "@/lib/settings";
import { brandFromSettings } from "@/lib/brand";
import { requireMemberPage } from "@/lib/page-auth";
import { isAdminLike } from "@/lib/permissions";
import { MemberSidebar } from "@/components/member/member-sidebar";
import { ToastProvider } from "@/components/ui/toast";

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const [auth, settings] = await Promise.all([requireMemberPage("/dashboard"), getSettings()]);
  const brand = brandFromSettings(settings);

  return (
    <ToastProvider>
      <div className="min-h-screen">
        <MemberSidebar
          brand={brand}
          supportEmail={settings.supportEmail}
          panelAccess={isAdminLike(auth.user)}
          user={{
            id: auth.user.id,
            username: auth.user.username,
            email: auth.user.email,
            emailVerified: Boolean(auth.user.emailVerifiedAt),
          }}
        />
        <div className="lg:pl-[272px]">
          <main className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-24 sm:px-6 lg:px-9 lg:pt-9">{children}</main>
          <div className="mx-auto w-full max-w-[1180px] px-4 pb-8 sm:px-6 lg:px-9">
            <p className="border-t border-white/6 pt-5 text-[10.5px] text-muted">
              {brand.name} member portal · Applications are reviewed by the owner and authorized administrators.
            </p>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
