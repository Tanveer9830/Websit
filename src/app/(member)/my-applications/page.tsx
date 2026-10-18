import type { Metadata } from "next";
import Link from "next/link";
import { requireMemberPage } from "@/lib/page-auth";
import { getSettings } from "@/lib/settings";
import { getMemberApplications } from "@/lib/applications";
import { APPLICATION_STATUSES, STATUS_META, type ApplicationStatus } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowRightIcon,
  ClipboardIcon,
  MessageIcon,
  SparklesIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = { title: "My applications" };

export default async function MyApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const auth = await requireMemberPage("/my-applications");
  const [settings, applications] = await Promise.all([
    getSettings(),
    getMemberApplications(auth.user.id),
  ]);

  const active = APPLICATION_STATUSES.includes(params.status as ApplicationStatus)
    ? (params.status as ApplicationStatus)
    : null;
  const filtered = active ? applications.filter((application) => application.status === active) : applications;

  const counts = Object.fromEntries(
    APPLICATION_STATUSES.map((status) => [
      status,
      applications.filter((application) => application.status === status).length,
    ]),
  ) as Record<ApplicationStatus, number>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your history"
        title="My applications."
        description="Every submission, every status change, and every piece of feedback the team has published to you — permanently linked to your account."
        actions={
          settings.applicationsOpen ? (
            <Link href="/apply" className="btn btn-primary">
              <ClipboardIcon size={16} />
              New application
            </Link>
          ) : (
            <span className="badge badge-dot text-amber-200">Applications paused</span>
          )
        }
      />

      {applications.length === 0 ? (
        <EmptyState
          icon={<ClipboardIcon size={24} />}
          title="No applications on record"
          description="Once you submit the staff application, it will appear here with a unique reference and a live status timeline."
          action={
            settings.applicationsOpen ? (
              <Link href="/apply" className="btn btn-primary">
                Start your application
                <ArrowRightIcon size={15} />
              </Link>
            ) : (
              <Link href="/dashboard" className="btn btn-secondary">
                Back to dashboard
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Link
              href="/my-applications"
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-medium transition ${
                !active
                  ? "border-brand/40 bg-brand/15 text-brand-bright"
                  : "border-white/8 bg-white/[0.025] text-muted hover:border-white/15 hover:text-snow"
              }`}
            >
              All <span className="ml-1 font-mono text-[9.5px] opacity-70">{applications.length}</span>
            </Link>
            {APPLICATION_STATUSES.map((status) => (
              <Link
                key={status}
                href={`/my-applications?status=${status}`}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-medium transition ${
                  active === status
                    ? "border-brand/40 bg-brand/15 text-brand-bright"
                    : "border-white/8 bg-white/[0.025] text-muted hover:border-white/15 hover:text-snow"
                }`}
              >
                {STATUS_META[status].label}
                <span className="ml-1 font-mono text-[9.5px] opacity-70">{counts[status]}</span>
              </Link>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <EmptyState
                compact
                icon={<SparklesIcon size={20} />}
                title="Nothing with that status"
                description="Try a different filter — your other applications are still here."
                action={
                  <Link href="/my-applications" className="btn btn-secondary btn-sm">
                    Clear filter
                  </Link>
                }
              />
            ) : (
              filtered.map((application) => (
                <Link
                  key={application.id}
                  href={`/my-applications/${application.id}`}
                  className="card group block p-5 transition hover:border-white/15 hover:bg-white/[0.04] sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-[13px] font-semibold tracking-wide text-snow">
                          {application.reference}
                        </span>
                        <StatusBadge status={application.status} />
                        {application.feedbackCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-2 py-0.5 text-[9px] font-semibold text-amber-200">
                            <MessageIcon size={9} />
                            {application.feedbackCount} feedback note{application.feedbackCount === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-muted">
                        {application.position ? (
                          <span className="inline-flex items-center gap-1.5">
                            <SparklesIcon size={11} className="text-brand-bright" />
                            {application.position}
                          </span>
                        ) : null}
                        <span>Submitted {formatDate(application.submittedAt)}</span>
                        <span>Last change {formatDateTime(application.lastStatusChangedAt)}</span>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[11.5px] font-semibold text-brand-bright transition group-hover:gap-2.5">
                      Open application
                      <ArrowRightIcon size={14} />
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
