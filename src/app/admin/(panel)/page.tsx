import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, auditLogs, users } from "@/db/schema";
import { requireAdminPage } from "@/lib/page-auth";
import { hasPermission } from "@/lib/permissions";
import { getStatusCounts } from "@/lib/applications";
import { APPLICATION_STATUSES, AUDIT_ACTION_LABELS, STATUS_META } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClipboardIcon,
  ClockIcon,
  LayersIcon,
  MessageIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
  UsersIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminDashboardPage() {
  const auth = await requireAdminPage("/admin");
  const canReview = hasPermission(auth.user, "REVIEW_APPLICATIONS");
  const canViewAudit = hasPermission(auth.user, "VIEW_AUDIT");

  const [statusCounts, memberRows, recentRows, auditRows] = await Promise.all([
    getStatusCounts(),
    db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "MEMBER")),
    canReview
      ? db
          .select({
            id: applications.id,
            reference: applications.reference,
            status: applications.status,
            position: applications.position,
            submittedAt: applications.submittedAt,
            username: users.username,
          })
          .from(applications)
          .innerJoin(users, eq(applications.userId, users.id))
          .orderBy(desc(applications.submittedAt))
          .limit(7)
      : Promise.resolve([]),
    canViewAudit
      ? db
          .select({
            id: auditLogs.id,
            action: auditLogs.action,
            actor: auditLogs.actorLabel,
            createdAt: auditLogs.createdAt,
          })
          .from(auditLogs)
          .orderBy(desc(auditLogs.createdAt))
          .limit(7)
      : Promise.resolve([]),
  ]);

  const totalMembers = Number(memberRows[0]?.count ?? 0);
  const decided = statusCounts.counts.APPROVED + statusCounts.counts.REJECTED;
  const approvalRate = decided > 0 ? Math.round((statusCounts.counts.APPROVED / decided) * 100) : 0;
  const inReview =
    statusCounts.counts.PENDING +
    statusCounts.counts.REVIEWING +
    statusCounts.counts.UNDER_CONSIDERATION +
    statusCounts.counts.ON_HOLD;

  const stats = [
    {
      label: "Total applications",
      value: statusCounts.total,
      hint: "All time",
      icon: <ClipboardIcon size={16} />,
      color: "#a78bfa",
    },
    ...APPLICATION_STATUSES.map((status) => ({
      label: STATUS_META[status].label,
      value: statusCounts.counts[status],
      hint:
        status === "PENDING"
          ? "Awaiting first look"
          : status === "REVIEWING"
            ? "In active review"
            : status === "UNDER_CONSIDERATION"
              ? "Shortlisted"
              : status === "APPROVED"
                ? "Accepted"
                : status === "REJECTED"
                  ? "Not selected"
                  : "Temporarily paused",
      icon:
        status === "PENDING" ? (
          <ClockIcon size={16} />
        ) : status === "APPROVED" ? (
          <CheckCircleIcon size={16} />
        ) : status === "UNDER_CONSIDERATION" ? (
          <SparklesIcon size={16} />
        ) : (
          <ClipboardIcon size={16} />
        ),
      color: STATUS_META[status].color,
    })),
    {
      label: "Total members",
      value: totalMembers,
      hint: "Registered accounts",
      icon: <UsersIcon size={16} />,
      color: "#22d3ee",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Control room"
        title="The whole pipeline, live."
        description={`Signed in as ${auth.user.role === "OWNER" ? "the owner" : "an administrator"}. Every number below is read directly from the database — no cached mock data.`}
        actions={
          canReview ? (
            <>
              <Link href="/admin/applications" className="btn btn-secondary">
                <ClipboardIcon size={15} />
                Review queue
              </Link>
              <Link href="/admin/applications?status=PENDING" className="btn btn-primary">
                Open pending
                <ArrowRightIcon size={15} />
              </Link>
            </>
          ) : (
            <Link href="/admin/questions" className="btn btn-secondary">
              <LayersIcon size={15} />
              Form builder
            </Link>
          )
        }
      />

      {!auth.user.emailVerifiedAt ? (
        <Alert tone="warning" title="Your admin email isn't verified">
          Email verification is strongly recommended for account recovery. Verify it from your profile or by signing in
          to the member portal.
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card group relative overflow-hidden p-4">
            <span
              className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-full opacity-[0.12] blur-2xl transition group-hover:opacity-25"
              style={{ backgroundColor: stat.color }}
            />
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted">{stat.label}</p>
              <span
                className="grid h-8 w-8 place-items-center rounded-lg border"
                style={{ color: stat.color, borderColor: `${stat.color}33`, backgroundColor: `${stat.color}14` }}
              >
                {stat.icon}
              </span>
            </div>
            <p className="mt-2.5 font-display text-[27px] font-semibold leading-none text-snow">{stat.value}</p>
            <p className="mt-1.5 text-[9.5px] text-muted">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr] xl:items-start">
        <div className="space-y-5">
          {canReview ? (
            <section className="card overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-4">
                <div>
                  <h2 className="font-display text-[15px] font-semibold text-snow">Latest submissions</h2>
                  <p className="mt-0.5 text-[10.5px] text-muted">Newest first, across every status.</p>
                </div>
                <Link
                  href="/admin/applications"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-bright transition hover:text-white"
                >
                  All applications
                  <ArrowRightIcon size={12} />
                </Link>
              </div>
              {recentRows.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    compact
                    icon={<ClipboardIcon size={20} />}
                    title="No applications yet"
                    description="Once members submit the form, submissions appear here immediately."
                  />
                </div>
              ) : (
                <div className="data-table">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Applicant</th>
                        <th className="hidden sm:table-cell">Team</th>
                        <th>Status</th>
                        <th className="hidden md:table-cell">Submitted</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {recentRows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <Link
                              href={`/admin/applications/${row.id}`}
                              className="font-mono text-[11px] font-semibold text-snow hover:text-brand-bright"
                            >
                              {row.reference}
                            </Link>
                          </td>
                          <td className="text-[11.5px] text-mist">{row.username}</td>
                          <td className="hidden text-[11px] text-muted sm:table-cell">{row.position ?? "—"}</td>
                          <td><StatusBadge status={row.status} size="sm" /></td>
                          <td className="hidden text-[10px] text-muted md:table-cell">{formatDateTime(row.submittedAt)}</td>
                          <td>
                            <Link href={`/admin/applications/${row.id}`} aria-label={`Open ${row.reference}`}>
                              <ArrowRightIcon size={13} className="text-muted transition hover:text-snow" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : (
            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-[15px] font-semibold text-snow">Your access</h2>
              <p className="mt-1 text-xs leading-relaxed text-mist">
                You don&apos;t have permission to review applications. Your workspace is limited to the tools the owner
                assigned to you.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {hasPermission(auth.user, "MANAGE_QUESTIONS") ? (
                  <Link href="/admin/questions" className="btn btn-secondary btn-sm">
                    <LayersIcon size={14} /> Form builder
                  </Link>
                ) : null}
                {hasPermission(auth.user, "MANAGE_MEMBERS") ? (
                  <Link href="/admin/members" className="btn btn-secondary btn-sm">
                    <UsersIcon size={14} /> Members
                  </Link>
                ) : null}
                {hasPermission(auth.user, "MANAGE_SETTINGS") ? (
                  <Link href="/admin/settings" className="btn btn-secondary btn-sm">
                    <ShieldCheckIcon size={14} /> Settings
                  </Link>
                ) : null}
              </div>
            </section>
          )}

          <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-[15px] font-semibold text-snow">Pipeline distribution</h2>
                <p className="mt-0.5 text-[10.5px] text-muted">Share of all {statusCounts.total} applications.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9.5px] text-mist">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                {inReview} in review
              </span>
            </div>

            <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-white/5">
              {APPLICATION_STATUSES.map((status) => {
                const count = statusCounts.counts[status];
                const width = statusCounts.total > 0 ? (count / statusCounts.total) * 100 : 0;
                if (width === 0) return null;
                return (
                  <span
                    key={status}
                    title={`${STATUS_META[status].label}: ${count}`}
                    style={{ width: `${width}%`, backgroundColor: STATUS_META[status].color }}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                  />
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {APPLICATION_STATUSES.map((status) => (
                <div key={status} className="flex items-center gap-2 text-[10.5px]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_META[status].color }} />
                  <span className="text-muted">{STATUS_META[status].label}</span>
                  <span className="ml-auto font-mono text-[9.5px] text-mist">{statusCounts.counts[status]}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="card relative overflow-hidden p-5">
            <span className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-400/15 blur-3xl" />
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted">Decision health</p>
            <div className="mt-4 flex items-center gap-5">
              <div
                className="relative grid h-[102px] w-[102px] shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#34d399 ${approvalRate * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                }}
                role="img"
                aria-label={`${approvalRate}% of decided applications approved`}
              >
                <div className="grid h-[78px] w-[78px] place-items-center rounded-full bg-[#0a0f20]">
                  <div className="text-center">
                    <p className="font-display text-xl font-semibold text-snow">{approvalRate}%</p>
                    <p className="text-[8px] uppercase tracking-wide text-muted">approval</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-[10.5px]">
                <p className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5 text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Approved
                  </span>
                  <span className="font-mono text-mist">{statusCounts.counts.APPROVED}</span>
                </p>
                <p className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5 text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Rejected
                  </span>
                  <span className="font-mono text-mist">{statusCounts.counts.REJECTED}</span>
                </p>
                <p className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5 text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/20" /> Undecided
                  </span>
                  <span className="font-mono text-mist">{inReview}</span>
                </p>
              </div>
            </div>
            <p className="mt-4 border-t border-white/7 pt-3 text-[10px] leading-relaxed text-muted">
              Approval rate counts decided applications only. Every status change is recorded with the acting admin and
              timestamp.
            </p>
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-display text-[14px] font-semibold text-snow">
              <ActivityIcon />
              Snapshot
            </h2>
            <dl className="mt-4 space-y-3 text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-muted">
                  <UsersIcon size={12} /> Members
                </dt>
                <dd className="font-mono text-mist">{totalMembers}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-muted">
                  <ClipboardIcon size={12} /> In review
                </dt>
                <dd className="font-mono text-mist">{inReview}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-muted">
                  <ClockIcon size={12} /> Decided
                </dt>
                <dd className="font-mono text-mist">{decided}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-muted">
                  <CalendarIcon size={12} /> Today
                </dt>
                <dd className="text-[9.5px] text-mist">{formatDateTime(new Date())}</dd>
              </div>
            </dl>
            <div className="mt-4 space-y-1.5">
              <Link href="/admin/settings" className="btn btn-secondary btn-sm w-full justify-start">
                <ShieldCheckIcon size={14} /> Panel settings
              </Link>
              <Link href="/admin/change-password" className="btn btn-ghost btn-sm w-full justify-start">
                <UserIcon size={14} /> Account security
              </Link>
            </div>
          </section>

          {canViewAudit ? (
            <section className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-[14px] font-semibold text-snow">Recent activity</h2>
                <Link href="/admin/settings?tab=audit" className="text-[10px] font-semibold text-brand-bright hover:text-white">
                  Audit log
                </Link>
              </div>
              {auditRows.length === 0 ? (
                <p className="mt-3 text-[10.5px] text-muted">No audit entries yet.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {auditRows.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-2.5">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      <div className="min-w-0">
                        <p className="truncate text-[10.5px] font-medium text-mist">
                          {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                        </p>
                        <p className="text-[9px] text-muted">
                          {entry.actor ?? "System"} · {formatDateTime(entry.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-[linear-gradient(120deg,rgba(139,92,246,0.1),rgba(59,130,246,0.04))] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="flex items-start gap-2.5 text-[10.5px] leading-relaxed text-mist">
          <MessageIcon size={13} className="mt-0.5 shrink-0 text-brand-bright" />
          Internal notes never leave the admin panel. Only feedback you explicitly publish appears in a member&apos;s
          application.
        </p>
        <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 font-mono text-[9px] text-muted">
          {auth.user.role === "OWNER" ? "OWNER" : "ADMIN"} SESSION
        </span>
      </section>
    </div>
  );
}

function ActivityIcon() {
  return <ShieldCheckIcon size={14} className="text-brand-bright" />;
}
