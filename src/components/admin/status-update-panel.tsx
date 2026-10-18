"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { APPLICATION_STATUSES, STATUS_META } from "@/lib/constants";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { CheckCircleIcon, ClockIcon, MailIcon, RefreshIcon } from "@/components/ui/icons";

export function StatusUpdatePanel({
  applicationId,
  currentStatus,
  reference,
  applicant,
  emailNotifications,
}: {
  applicationId: string;
  currentStatus: string;
  reference: string;
  applicant: string;
  emailNotifications: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const dirty = status !== currentStatus;
  const consequential = status === "REJECTED";

  async function save() {
    if (working || !dirty) return;
    setWorking(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/applications/${applicationId}/status`, {
        method: "POST",
        body: { status, note },
      });
      toast.push({
        title: "Status updated",
        description: `${reference} is now ${STATUS_META[status as keyof typeof STATUS_META]?.label ?? status}. History recorded.`,
        tone: "success",
      });
      setNote("");
      setConfirmOpen(false);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError
          ? requestError.message
          : "Could not update the status. Please try again.",
      );
      setConfirmOpen(false);
    } finally {
      setWorking(false);
    }
  }

  function submit() {
    if (!dirty) return;
    if (consequential) {
      setConfirmOpen(true);
      return;
    }
    void save();
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[14px] font-semibold text-snow">Review decision</h2>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-muted">
          Status
        </span>
      </div>
      <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
        Updates are append-only. The change is attributed to you with a server timestamp and audit entry.
      </p>

      {error ? (
        <div className="mt-3">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="status" className="field-label">
            <span>New status</span>
          </label>
          <select
            id="status"
            className="select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {APPLICATION_STATUSES.map((option) => (
              <option key={option} value={option}>
                {STATUS_META[option].label}
              </option>
            ))}
          </select>
          {dirty ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-[9.5px] leading-relaxed text-brand-bright">
              <ClockIcon size={10} className="mt-0.5 shrink-0" />
              {STATUS_META[status as keyof typeof STATUS_META]?.description}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="status-note" className="field-label">
            <span>Internal note</span>
            <span className="text-[9.5px] font-normal text-muted">Not shown to applicant</span>
          </label>
          <textarea
            id="status-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Why is this moving to the new stage? (optional)"
            className="textarea min-h-[84px]"
            maxLength={1000}
          />
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!dirty || working}
          className="btn btn-primary btn-sm w-full"
        >
          {working ? <Spinner size={14} /> : <CheckCircleIcon size={14} />}
          {working ? "Saving…" : dirty ? `Move to ${STATUS_META[status as keyof typeof STATUS_META]?.label ?? status}` : "No change selected"}
        </button>

        {dirty ? (
          <button
            type="button"
            onClick={() => {
              setStatus(currentStatus);
              setNote("");
            }}
            className="btn btn-ghost btn-sm w-full"
            disabled={working}
          >
            <RefreshIcon size={13} />
            Cancel change
          </button>
        ) : null}
      </div>

      <p className="mt-4 flex items-start gap-2 border-t border-white/7 pt-3 text-[9.5px] leading-relaxed text-muted">
        <MailIcon size={11} className="mt-0.5 shrink-0" />
        {emailNotifications
          ? "Status-update emails are enabled. The applicant will be emailed after this change."
          : "Status-update emails are disabled in settings. The applicant sees the change on their dashboard."}
      </p>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={save}
        title={`Reject ${applicant}'s application?`}
        description={`This records a final rejection for ${reference}. The applicant sees the status immediately and can never set it back themselves. A note may help future reviewers.`}
        confirmLabel="Reject application"
        tone="danger"
      />
    </section>
  );
}
