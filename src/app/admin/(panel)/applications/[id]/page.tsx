import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/page-auth";
import { hasPermission } from "@/lib/permissions";
import { getAdminApplication } from "@/lib/applications";
import { parseStoredAnswer } from "@/lib/form";
import { getSettings } from "@/lib/settings";
import { STATUS_META, type ApplicationStatus } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { AccessDenied } from "@/components/admin/access-denied";
import { StatusUpdatePanel } from "@/components/admin/status-update-panel";
import { ReviewNotes } from "@/components/admin/review-notes";
import { StatusBadge } from "@/components/ui/status-badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Alert } from "@/components/ui/alert";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClipboardIcon,
  ClockIcon,
  DiscordIcon,
  ExternalLinkIcon,
  FileTextIcon,
  LockIcon,
  MailIcon,
  MessageIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = { title: "Review application" };

function statusLabel(status: string) {
  return status in STATUS_META ? STATUS_META[status as ApplicationStatus].label : status;
}

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await requireAdminPage(`/admin/applications/${id}`);
  if (!hasPermission(auth.user, "REVIEW_APPLICATIONS")) {
    return <AccessDenied title="Reviewing is restricted." />;
  }

  const [detail, settings] = await Promise.all([getAdminApplication(id), getSettings()]);
  if (!detail) notFound();

  const { application, applicant, answers, history, notes } = detail;
  const isFinal = application.status === "APPROVED" || application.status === "REJECTED";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/admin/applications"
          className="inline-flex items-center gap-1.5 text-[11px] text-muted transition hover:text-snow"
        >
          <ArrowLeftIcon size={13} />
          Review queue
        </Link>
        <div className="flex items-center gap-2">
          <CopyButton value={application.reference} label="Copy reference" />
          <CopyButton value={applicant.id} label="Copy member ID" />
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="eyebrow mb-0">
              <FileTextIcon size={11} />
              Application review
            </span>
            <StatusBadge status={application.status} />
            {isFinal ? (
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-muted">
                Final
              </span>
            ) : null}
          </div>
          <h1 className="mt-2 font-display text-[26px] font-semibold tracking-tight text-snow sm:text-[30px]">
            {application.reference}
          </h1>
          <p className="mt-1 text-[11.5px] text-muted">
            Submitted {formatDateTime(application.submittedAt)} · Form v{detail.formVersion.version} ·{" "}
            {application.position ?? "No team selected"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/members?q=${encodeURIComponent(applicant.username)}`} className="btn btn-secondary btn-sm">
            <UserIcon size={14} />
            Member record
          </Link>
          <Link href={`/admin/applications?q=${encodeURIComponent(application.reference)}`} className="btn btn-ghost btn-sm">
            <ClipboardIcon size={14} />
            Similar / search
          </Link>
        </div>
      </div>

      {application.status === "PENDING" ? (
        <Alert tone="info" title="First look">
          This application is still pending. When you begin reviewing it, move it to <strong>Reviewing</strong> so other
          admins can see it is being handled.
        </Alert>
      ) : null}
      {application.status === "ON_HOLD" ? (
        <Alert tone="warning" title="This application is on hold">
          Add an internal note explaining why, so the next reviewer has context. The applicant still sees the on-hold
          status.
        </Alert>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr] xl:items-start">
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-3.5">
              <div className="flex items-center gap-2">
                <FileTextIcon size={15} className="text-brand-bright" />
                <h2 className="font-display text-[15px] font-semibold text-snow">Application answers</h2>
              </div>
              <span className="inline-flex items-center gap-1 text-[9.5px] text-muted">
                <LockIcon size={10} />
                Historical snapshot · v{detail.formVersion.version}
              </span>
            </div>

            {answers.length === 0 ? (
              <p className="mt-4 text-[12px] text-muted">This form version had no questions.</p>
            ) : (
              <dl className="divide-y divide-white/6">
                {answers.map((answer, index) => {
                  const value = parseStoredAnswer(answer.answer);
                  return (
                    <div key={answer.id} className="py-4 last:pb-0">
                      <dt className="flex items-start gap-2">
                        <span className="mt-0.5 font-mono text-[9px] text-muted">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span>
                          <span className="block text-[11.5px] font-medium leading-snug text-snow">
                            {answer.questionTitle}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[8.5px] uppercase tracking-wide text-muted">
                            {answer.questionType.replaceAll("_", " ").toLowerCase()}
                            {answer.required ? " · required" : ""}
                          </span>
                        </span>
                      </dt>
                      <dd className="mt-2 whitespace-pre-wrap break-words pl-6 text-[12.5px] leading-relaxed text-mist">
                        {value === null || value === "" || (Array.isArray(value) && value.length === 0) ? (
                          <span className="text-muted">Not answered</span>
                        ) : Array.isArray(value) ? (
                          <span className="flex flex-wrap gap-1.5">
                            {value.map((item) => (
                              <span
                                key={item}
                                className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-mist"
                              >
                                {item}
                              </span>
                            ))}
                          </span>
                        ) : (
                          value
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </section>

          <ReviewNotes
            applicationId={application.id}
            reference={application.reference}
            notes={notes.map((note) => ({
              ...note,
              createdAt: note.createdAt.toISOString(),
              publishedAt: note.publishedAt?.toISOString() ?? null,
            }))}
          />

          <section className="card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <ClockIcon size={15} className="text-cyan-300" />
              <h2 className="font-display text-[15px] font-semibold text-snow">Status history</h2>
              <span className="ml-auto rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] text-muted">
                {history.length} event{history.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1 text-[10.5px] text-muted">
              Admin-only view. Actors and review notes are recorded with each transition.
            </p>

            <ol className="mt-5 space-y-4 border-l border-white/10 pl-5">
              {history.map((entry, index) => {
                const current = index === history.length - 1;
                return (
                  <li key={entry.id} className="relative">
                    <span
                      className={`absolute -left-[25px] top-1 grid h-3 w-3 place-items-center rounded-full border-2 ${
                        current ? "border-brand bg-brand" : "border-white/20 bg-night"
                      }`}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.from ? (
                        <>
                          <span className="text-[10px] text-muted">{statusLabel(entry.from)}</span>
                          <span className="text-[10px] text-muted">→</span>
                        </>
                      ) : null}
                      <StatusBadge status={entry.to} size="sm" />
                      {current ? (
                        <span className="text-[8.5px] font-semibold uppercase tracking-wide text-brand-bright/80">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[9.5px] text-muted">
                      {entry.actor ?? "System"} · {formatDateTime(entry.at)}
                    </p>
                    {entry.note ? (
                      <p className="mt-1.5 rounded-lg border border-white/7 bg-white/[0.025] px-2.5 py-1.5 text-[10.5px] leading-relaxed text-mist">
                        {entry.note}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-[14px] font-semibold text-snow">Applicant</h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-2 py-0.5 text-[8.5px] font-medium text-emerald-300">
                <ShieldCheckIcon size={9} />
                {applicant.emailVerifiedAt ? "Verified" : "Unverified"}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--brand-from),var(--brand-to))] font-display text-[13px] font-bold text-white">
                {applicant.username.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-snow">{applicant.username}</p>
                <p className="truncate text-[10px] text-muted">Member since {formatDate(applicant.createdAt)}</p>
              </div>
            </div>

            <dl className="mt-4 space-y-2.5 text-[10.5px]">
              <div className="flex items-start justify-between gap-3">
                <dt className="inline-flex shrink-0 items-center gap-1.5 text-muted">
                  <MailIcon size={11} /> Email
                </dt>
                <dd className="min-w-0 break-all text-right text-mist">{applicant.email}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="inline-flex shrink-0 items-center gap-1.5 text-muted">
                  <UserIcon size={11} /> Member ID
                </dt>
                <dd className="min-w-0 break-all text-right font-mono text-[9px] text-mist">{applicant.id}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="inline-flex shrink-0 items-center gap-1.5 text-muted">
                  <SparklesIcon size={11} /> Team
                </dt>
                <dd className="text-right text-mist">{application.position ?? "—"}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="inline-flex shrink-0 items-center gap-1.5 text-muted">
                  <DiscordIcon size={11} /> Discord
                </dt>
                <dd className="min-w-0 text-right text-mist">
                  {application.discordUsername || application.discordId ? (
                    <>
                      {application.discordUsername ? <span className="block">{application.discordUsername}</span> : null}
                      {application.discordId ? (
                        <span className="block font-mono text-[9px] text-muted">{application.discordId}</span>
                      ) : null}
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="inline-flex shrink-0 items-center gap-1.5 text-muted">
                  <CalendarIcon size={11} /> Submitted
                </dt>
                <dd className="text-right text-mist">{formatDateTime(application.submittedAt)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="inline-flex shrink-0 items-center gap-1.5 text-muted">
                  <ClockIcon size={11} /> Last change
                </dt>
                <dd className="text-right text-mist">{formatDateTime(application.lastStatusChangedAt)}</dd>
              </div>
            </dl>

            <Link
              href={`/admin/applications?q=${encodeURIComponent(applicant.username)}`}
              className="mt-4 flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-[10px] text-muted transition hover:border-white/15 hover:text-snow"
            >
              View this member&apos;s other applications
              <ExternalLinkIcon size={11} />
            </Link>
          </section>

          <StatusUpdatePanel
            applicationId={application.id}
            currentStatus={application.status}
            reference={application.reference}
            applicant={applicant.username}
            emailNotifications={settings.notifyStatusEmail}
          />

          <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold text-mist">
              <MessageIcon size={11} className="text-emerald-300" />
              Feedback visibility
            </p>
            <p className="mt-1.5 text-[9.5px] leading-relaxed text-muted">
              Internal notes: {notes.filter((note) => note.visibility === "INTERNAL").length} · Applicant feedback:{" "}
              {notes.filter((note) => note.visibility === "APPLICANT").length}. Members never receive internal notes in
              any API response.
            </p>
          </section>
        </aside>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/7 pt-4 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircleIcon size={11} className="text-emerald-300" /> Status changes are transactional
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheckIcon size={11} /> Every action creates an audit log entry
        </span>
        <span className="inline-flex items-center gap-1.5">
          <LockIcon size={11} /> Answer snapshot is immutable
        </span>
      </div>
    </div>
  );
}
