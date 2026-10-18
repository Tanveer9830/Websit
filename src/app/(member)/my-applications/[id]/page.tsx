import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMemberPage } from "@/lib/page-auth";
import { getMemberApplication } from "@/lib/applications";
import { parseStoredAnswer } from "@/lib/form";
import { STATUS_META, type ApplicationStatus } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert } from "@/components/ui/alert";
import { CopyButton } from "@/components/ui/copy-button";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  LockIcon,
  MessageIcon,
  SparklesIcon,
  UserIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = { title: "Application details" };

const TIMELINE = [
  "PENDING",
  "REVIEWING",
  "UNDER_CONSIDERATION",
  "APPROVED",
] as const;

function statusLabel(status: string) {
  return status in STATUS_META ? STATUS_META[status as ApplicationStatus].label : status;
}

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const auth = await requireMemberPage(`/my-applications/${id}`);
  const application = await getMemberApplication(id, auth.user.id);
  if (!application) notFound();

  const submittedNow = query.submitted === "1";
  const isFinal = application.status === "APPROVED" || application.status === "REJECTED";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/my-applications"
          className="inline-flex items-center gap-1.5 text-[11px] text-muted transition hover:text-snow"
        >
          <ArrowLeftIcon size={13} />
          All applications
        </Link>
      </div>

      {submittedNow ? (
        <Alert tone="success" title="Application submitted">
          Keep your reference safe. The team has been notified in the admin queue and your status is live below.
        </Alert>
      ) : null}

      <PageHeader
        eyebrow="Application"
        title={application.reference}
        description={
          application.position
            ? `Applying for ${application.position}. Answers are preserved exactly as submitted on form v${application.formVersion}.`
            : `Answers are preserved exactly as submitted on form v${application.formVersion}.`
        }
        actions={
          <>
            <CopyButton value={application.reference} label="Copy reference" />
            <StatusBadge status={application.status} size="lg" />
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="flex items-center gap-2 border-b border-white/8 pb-3.5">
              <FileTextIcon size={16} className="text-brand-bright" />
              <h2 className="font-display text-[15px] font-semibold text-snow">Your answers</h2>
              <span className="ml-auto inline-flex items-center gap-1 text-[9.5px] text-muted">
                <LockIcon size={10} />
                Locked snapshot
              </span>
            </div>
            <dl className="divide-y divide-white/6">
              {application.answers.map((answer) => {
                const value = parseStoredAnswer(answer.answer);
                return (
                  <div key={answer.id} className="py-4 first:pt-4 last:pb-0">
                    <dt className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted">
                      {answer.questionTitle}
                      <span className="rounded border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[8.5px] font-medium normal-case tracking-normal text-muted">
                        {answer.questionType.replaceAll("_", " ").toLowerCase()}
                      </span>
                    </dt>
                    <dd className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-snow">
                      {value === null || value === "" || (Array.isArray(value) && value.length === 0) ? (
                        <span className="text-muted">Not answered</span>
                      ) : Array.isArray(value) ? (
                        <span className="flex flex-wrap gap-1.5">
                          {value.map((item) => (
                            <span
                              key={item}
                              className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11.5px] text-mist"
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
          </section>

          <section className="card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <MessageIcon size={16} className="text-amber-200" />
              <h2 className="font-display text-[15px] font-semibold text-snow">Feedback from the team</h2>
              <span className="ml-auto rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] text-muted">
                {application.feedback.length}
              </span>
            </div>
            {application.feedback.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-6 text-center">
                <p className="text-[12px] font-medium text-mist">Nothing published yet</p>
                <p className="mx-auto mt-1 max-w-xs text-[10.5px] leading-relaxed text-muted">
                  Reviewers keep private notes to themselves. If they choose to share feedback, it will appear here and
                  in your dashboard.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {application.feedback.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-xl border border-amber-300/15 bg-amber-300/[0.045] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.13em] text-amber-200/90">
                        <SparklesIcon size={10} />
                        Reviewer feedback
                      </span>
                      <span className="text-[9.5px] text-muted">{formatDate(note.publishedAt ?? note.createdAt)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-amber-50/90">
                      {note.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card p-5">
            <h2 className="font-display text-[15px] font-semibold text-snow">Status timeline</h2>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
              Every change is recorded by the server with an official timestamp. You cannot set or alter your own status.
            </p>

            <ol className="relative mt-5 space-y-4 border-l border-white/10 pl-5">
              {application.history.map((entry, index) => {
                const isCurrent = index === application.history.length - 1;
                return (
                  <li key={entry.id} className="relative">
                    <span
                      className={`absolute -left-[25px] top-0.5 grid h-3 w-3 place-items-center rounded-full border-2 ${
                        isCurrent ? "border-brand bg-brand" : "border-white/20 bg-night"
                      }`}
                    >
                      {isCurrent ? <span className="h-1 w-1 rounded-full bg-white" /> : null}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={entry.status} size="sm" />
                      {isCurrent ? (
                        <span className="text-[8.5px] font-semibold uppercase tracking-wider text-brand-bright/80">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-[9.5px] text-muted">
                      <ClockIcon size={9} />
                      {formatDateTime(entry.at)}
                    </p>
                  </li>
                );
              })}
            </ol>

            {!isFinal ? (
              <div className="mt-5 rounded-xl border border-white/7 bg-white/[0.025] p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold text-mist">
                  <ClockIcon size={11} className="text-cyan-300" />
                  In progress
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  Your application is in an active review stage. Check back here — the status updates automatically.
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-200">
                  <CheckCircleIcon size={11} />
                  Decision recorded
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  This application has reached a final decision. You&apos;re welcome to apply again if the team opens
                  another round.
                </p>
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-display text-[15px] font-semibold text-snow">Submission details</h2>
            <dl className="mt-4 space-y-3 text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Reference</dt>
                <dd className="font-mono text-[10.5px] text-mist">{application.reference}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Form version</dt>
                <dd className="text-mist">v{application.formVersion}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-muted">
                  <CalendarIcon size={11} /> Submitted
                </dt>
                <dd className="text-mist">{formatDate(application.submittedAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-muted">
                  <ClockIcon size={11} /> Last update
                </dt>
                <dd className="text-mist">{formatDateTime(application.updatedAt)}</dd>
              </div>
              {application.position ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Team</dt>
                  <dd className="text-mist">{application.position}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="rounded-2xl border border-white/8 bg-[linear-gradient(140deg,rgba(139,92,246,0.12),rgba(59,130,246,0.04))] p-5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-snow">
              <UserIcon size={12} className="text-brand-bright" />
              Something wrong?
            </p>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-mist">
              Contact the team with your reference number. Submitted answers cannot be edited, but reviewers can note
              corrections internally.
            </p>
            <Link href="/dashboard" className="mt-3 inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-brand-bright hover:text-white">
              Back to dashboard
            </Link>
          </section>
        </aside>
      </div>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <LockIcon size={11} /> Answers are server-snapshotted at submission
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageIcon size={11} /> Internal notes are never included in member responses
        </span>
      </p>
    </div>
  );
}
