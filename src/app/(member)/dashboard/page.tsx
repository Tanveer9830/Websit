import type { Metadata } from "next";
import Link from "next/link";
import { requireMemberPage } from "@/lib/page-auth";
import { getSettings } from "@/lib/settings";
import { getMemberApplications, getStatusCounts } from "@/lib/applications";
import { formatDate, formatDateTime, initials } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { CopyButton } from "@/components/ui/copy-button";
import { VerifyEmailBanner } from "@/components/member/verify-email-banner";
import {
  ActivityIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClipboardIcon,
  ClockIcon,
  FileTextIcon,
  MailIcon,
  MessageIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = { title: "Dashboard" };

const ACTIVE = ["PENDING", "REVIEWING", "UNDER_CONSIDERATION", "ON_HOLD"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; denied?: string }>;
}) {
  const params = await searchParams;
  const auth = await requireMemberPage("/dashboard");
  const [settings, applications, statusCounts] = await Promise.all([
    getSettings(),
    getMemberApplications(auth.user.id),
    getStatusCounts(auth.user.id),
  ]);

  const activeCount = applications.filter((application) => ACTIVE.includes(application.status)).length;
  const approved = statusCounts.counts.APPROVED;
  const feedbackCount = applications.reduce((sum, application) => sum + application.feedbackCount, 0);
  const latest = applications.slice(0, 3);
  const alreadyActive = activeCount > 0 && !settings.allowMultiple;
  const canApply = settings.applicationsOpen && !alreadyActive;
  const applyLabel = !settings.applicationsOpen
    ? "Applications paused"
    : alreadyActive
      ? "Application in progress"
      : "Apply for staff";

  return (
    <div className="space-y-6">
      {params.verified === "1" ? (
        <Alert tone="success" title="Email verified">
          Your email is confirmed. Your account is fully set up — good luck with the application.
        </Alert>
      ) : null}
      {params.denied === "admin" ? (
        <Alert tone="warning" title="That area is for administrators">
          Your member account can&apos;t access the administration panel. If you believe this is a mistake, contact the
          panel owner.
        </Alert>
      ) : null}
      {!auth.user.emailVerifiedAt ? <VerifyEmailBanner email={auth.user.email} /> : null}

      <PageHeader
        eyebrow="Member dashboard"
        title={`Welcome back, ${auth.user.username}.`}
        description="Your applications, their real-time status, and everything a reviewer has chosen to share with you — in one place."
        actions={
          <>
            <Link href="/profile" className="btn btn-secondary">
              <UserIcon size={16} />
              Profile
            </Link>
            {canApply ? (
              <Link href="/apply" className="btn btn-primary">
                <ClipboardIcon size={16} />
                Apply for staff
              </Link>
            ) : (
              <button type="button" disabled className="btn btn-secondary" title={applyLabel}>
                <ClipboardIcon size={16} />
                {applyLabel}
              </button>
            )}
          </>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total applications",
            value: statusCounts.total,
            hint: statusCounts.total === 0 ? "Nothing submitted yet" : "Every submission you've made",
            icon: <FileTextIcon size={18} />,
            tone: "text-brand-bright bg-brand/12 border-brand/20",
          },
          {
            label: "In review",
            value: activeCount,
            hint: "Pending, reviewing, held or considering",
            icon: <ActivityIcon size={18} />,
            tone: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",
          },
          {
            label: "Approved",
            value: approved,
            hint: approved > 0 ? "Accepted applications" : "Decisions will appear here",
            icon: <CheckCircleIcon size={18} />,
            tone: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
          },
          {
            label: "Published feedback",
            value: feedbackCount,
            hint: feedbackCount > 0 ? "Notes shared with you" : "Private reviewer notes stay private",
            icon: <MessageIcon size={18} />,
            tone: "text-amber-200 bg-amber-300/10 border-amber-300/20",
          },
        ].map((stat) => (
          <div key={stat.label} className="card relative overflow-hidden p-5">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-muted">{stat.label}</p>
              <span className={`grid h-9 w-9 place-items-center rounded-xl border ${stat.tone}`}>{stat.icon}</span>
            </div>
            <p className="mt-3 font-display text-[30px] font-semibold leading-none text-snow">{stat.value}</p>
            <p className="mt-2 text-[10.5px] leading-relaxed text-muted">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-display text-base font-semibold text-snow">My applications</h2>
              <p className="mt-0.5 text-[11px] text-muted">
                {applications.length === 0
                  ? "Your application history will live here."
                  : `${statusCounts.total} submission${statusCounts.total === 1 ? "" : "s"} on record`}
              </p>
            </div>
            <Link
              href="/my-applications"
              className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-brand-bright transition hover:text-white"
            >
              View all
              <ArrowRightIcon size={13} />
            </Link>
          </div>

          {latest.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                compact
                icon={<ClipboardIcon size={22} />}
                title="No applications yet"
                description={
                  settings.applicationsOpen
                    ? "When you're ready, the application takes about ten minutes. Every answer is reviewed by a human."
                    : "Applications are paused right now. Your dashboard will still show anything you've submitted before."
                }
                action={
                  canApply ? (
                    <Link href="/apply" className="btn btn-primary btn-sm">
                      Start an application
                      <ArrowRightIcon size={14} />
                    </Link>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-white/6">
              {latest.map((application) => (
                <li key={application.id} className="group px-5 py-4 transition hover:bg-white/[0.025] sm:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[12px] font-semibold tracking-wide text-snow">
                          {application.reference}
                        </span>
                        <StatusBadge status={application.status} />
                        {application.feedbackCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-2 py-0.5 text-[9px] font-semibold text-amber-200">
                            <MessageIcon size={9} />
                            Feedback
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted">
                        {application.position ? (
                          <span className="inline-flex items-center gap-1">
                            <SparklesIcon size={10} className="text-brand-bright" />
                            {application.position}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1">
                          <CalendarIcon size={10} />
                          Submitted {formatDate(application.submittedAt)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ClockIcon size={10} />
                          Updated {formatDate(application.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/my-applications/${application.id}`}
                      className="btn btn-secondary btn-sm shrink-0"
                    >
                      View
                      <ArrowRightIcon size={12} />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-5">
          <section className="card relative overflow-hidden p-5">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand/20 blur-2xl" />
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--brand-from),var(--brand-to))] font-display text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(139,92,246,0.8)]">
                {initials(auth.user.username)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-[15px] font-semibold text-snow">{auth.user.username}</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Member account</p>
              </div>
            </div>

            <dl className="mt-5 space-y-3 text-[11.5px]">
              <div>
                <dt className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted">Member ID</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 truncate rounded-md border border-white/8 bg-black/25 px-2 py-1 font-mono text-[10px] text-mist">
                    {auth.user.id}
                  </code>
                  <CopyButton value={auth.user.id} iconOnly label="Copy member ID" />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Email</dt>
                <dd className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-mist">{auth.user.email}</span>
                  {auth.user.emailVerifiedAt ? (
                    <ShieldCheckIcon size={13} className="shrink-0 text-emerald-300" />
                  ) : (
                    <span className="shrink-0 text-[9px] font-medium text-amber-300">Unverified</span>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Joined</dt>
                <dd className="text-mist">{formatDateTime(auth.user.createdAt)}</dd>
              </div>
            </dl>

            <div className="mt-5 flex gap-2">
              <Link href="/profile" className="btn btn-secondary btn-sm flex-1">
                Edit profile
              </Link>
              <Link href="/my-applications" className="btn btn-ghost btn-sm flex-1">
                History
              </Link>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-display text-[14px] font-semibold text-snow">
              <SparklesIcon size={15} className="text-brand-bright" />
              What happens next?
            </h2>
            <ol className="mt-3.5 space-y-3">
              {[
                ["Received", "Your submission is stored with a unique reference."],
                ["Reviewed", "An authorized admin reads every answer and may add internal notes."],
                ["Shared", "Your status updates in real time; published feedback appears in the application."],
              ].map(([title, description], index) => (
                <li key={title} className="flex gap-3">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] font-mono text-[9px] text-brand-bright">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[11.5px] font-medium text-snow">{title}</p>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 flex items-center gap-1.5 border-t border-white/7 pt-3 text-[10px] text-muted">
              <MailIcon size={11} />
              Support: {settings.supportEmail}
            </p>
          </section>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(120deg,rgba(139,92,246,0.14),rgba(59,130,246,0.08))] px-5 py-5 sm:px-6">
        <div className="pointer-events-none absolute -right-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-brand/25 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-brand-bright">
              <ClipboardIcon size={18} />
            </span>
            <div>
              <p className="font-display text-[15px] font-semibold text-snow">
                {alreadyActive ? "Your application is already in the queue." : "Ready to join the team?"}
              </p>
              <p className="mt-0.5 max-w-lg text-[11.5px] leading-relaxed text-mist">
                {alreadyActive
                  ? "Multiple submissions are disabled by the panel owner. You can apply again after a decision."
                  : "The form is built by the panel owner and published live. Answers are locked after submission."}
              </p>
            </div>
          </div>
          {canApply ? (
            <Link href="/apply" className="btn btn-primary btn-sm shrink-0">
              Apply for staff
              <ArrowRightIcon size={14} />
            </Link>
          ) : (
            <span className="badge badge-dot shrink-0 text-amber-200">{applyLabel}</span>
          )}
        </div>
      </section>
    </div>
  );
}
