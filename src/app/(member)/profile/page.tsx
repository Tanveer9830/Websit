import type { Metadata } from "next";
import Link from "next/link";
import { requireMemberPage } from "@/lib/page-auth";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileForms } from "@/components/member/profile-forms";
import { VerifyEmailBanner } from "@/components/member/verify-email-banner";
import { LayoutIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Profile & security" };

export default async function ProfilePage() {
  const auth = await requireMemberPage("/profile");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your account"
        title="Profile & security."
        description="Update your identity, rotate your password, and control the sessions attached to your member account."
        actions={
          <Link href="/dashboard" className="btn btn-secondary">
            <LayoutIcon size={16} />
            Dashboard
          </Link>
        }
      />

      {!auth.user.emailVerifiedAt ? <VerifyEmailBanner email={auth.user.email} /> : null}

      <p className="text-[10.5px] text-muted">
        Member since {formatDateTime(auth.user.createdAt)}
        {auth.user.lastLoginAt ? ` · Last sign-in ${formatDateTime(auth.user.lastLoginAt)}` : ""}
      </p>

      <ProfileForms
        user={{
          id: auth.user.id,
          username: auth.user.username,
          email: auth.user.email,
          emailVerified: Boolean(auth.user.emailVerifiedAt),
          role: auth.user.role,
        }}
      />
    </div>
  );
}
