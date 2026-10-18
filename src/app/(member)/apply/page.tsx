import type { Metadata } from "next";
import Link from "next/link";
import { requireMemberPage } from "@/lib/page-auth";
import { getSettings } from "@/lib/settings";
import { getPublishedForm } from "@/lib/form";
import { getMemberApplications } from "@/lib/applications";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ApplyWizard } from "@/components/member/apply-wizard";
import {
  ArrowRightIcon,
  ClipboardIcon,
  ClockIcon,
  LayoutIcon,
  MailIcon,
  ShieldCheckIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = { title: "Apply for staff" };

const ACTIVE = ["PENDING", "REVIEWING", "UNDER_CONSIDERATION", "ON_HOLD"];

export default async function ApplyPage() {
  const auth = await requireMemberPage("/apply");
  const [settings, form, applications] = await Promise.all([
    getSettings(),
    getPublishedForm(),
    getMemberApplications(auth.user.id),
  ]);

  const activeApplication = applications.find((application) => ACTIVE.includes(application.status));
  const blockedByLimit = !settings.allowMultiple && Boolean(activeApplication);
  const blockedByVerification = settings.requireVerifiedEmail && !auth.user.emailVerifiedAt;
  const formUnavailable = !form || form.questions.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Staff application"
        title="Let's build something together."
        description="The live application form, managed by the panel owner. Take your time — you can review every answer before it's submitted."
        actions={
          <Link href="/dashboard" className="btn btn-secondary">
            <LayoutIcon size={16} />
            Dashboard
          </Link>
        }
      />

      {!settings.applicationsOpen ? (
        <EmptyState
          icon={<ClockIcon size={24} />}
          title="Applications are paused"
          description="The team has closed this round for now. Keep an eye on your dashboard — your existing applications and their statuses are still available."
          action={
            <Link href="/my-applications" className="btn btn-secondary">
              View my applications
            </Link>
          }
        />
      ) : formUnavailable ? (
        <EmptyState
          icon={<ClipboardIcon size={24} />}
          title="The form isn't ready yet"
          description="The owner hasn't published a staff application form with questions. Please check back shortly."
          action={
            <Link href="/dashboard" className="btn btn-secondary">
              Back to dashboard
            </Link>
          }
        />
      ) : blockedByVerification ? (
        <div className="mx-auto max-w-xl">
          <div className="card p-6 text-center sm:p-8">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-200">
              <MailIcon size={24} />
            </div>
            <h2 className="mt-5 font-display text-xl font-semibold text-snow">Verify your email first</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-mist">
              This panel requires a verified email before applications can be submitted. Send yourself a fresh
              verification link, or check your inbox for the one already waiting.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
              <Link href="/profile" className="btn btn-primary">
                <MailIcon size={15} />
                Go to profile & resend
              </Link>
              <Link href="/dashboard" className="btn btn-secondary">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      ) : blockedByLimit && activeApplication ? (
        <div className="mx-auto max-w-xl">
          <div className="card p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
                <ClockIcon size={19} />
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold text-snow">You already have an active application.</h2>
                <p className="mt-2 text-sm leading-relaxed text-mist">
                  The panel owner has limited members to one active application at a time. You can apply again after
                  this one reaches a final decision.
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.025] p-4 text-[11.5px]">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono font-semibold text-snow">{activeApplication.reference}</span>
                <span className="text-muted">Submitted {formatDate(activeApplication.submittedAt)}</span>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <Link href={`/my-applications/${activeApplication.id}`} className="btn btn-primary">
                View application
                <ArrowRightIcon size={15} />
              </Link>
              <Link href="/my-applications" className="btn btn-secondary">
                All applications
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <ApplyWizard
          questions={form!.questions}
          formVersion={form!.version}
          user={{
            username: auth.user.username,
            email: auth.user.email,
            emailVerified: Boolean(auth.user.emailVerifiedAt),
          }}
          config={{
            positionsEnabled: settings.positionsEnabled,
            positions: settings.positions,
            collectDiscord: settings.collectDiscord,
            requireVerifiedEmail: settings.requireVerifiedEmail,
          }}
        />
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-white/7 bg-white/[0.02] p-4 text-[10.5px] leading-relaxed text-muted sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2">
          <ShieldCheckIcon size={13} className="text-emerald-300" />
          Submitted answers are snapshotted with the form version, so later question edits never change your application.
        </span>
        <span className="inline-flex items-center gap-2">
          <ClockIcon size={13} />
          Status updates appear on your dashboard
        </span>
      </div>

      {settings.requireVerifiedEmail && auth.user.emailVerifiedAt ? (
        <Alert tone="success" title="Email verified">
          You&apos;re eligible to submit. Good luck!
        </Alert>
      ) : null}
    </div>
  );
}
