"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  EyeIcon,
  LockIcon,
  MessageIcon,
  SendIcon,
  ShieldCheckIcon,
} from "@/components/ui/icons";

type Note = {
  id: string;
  body: string;
  visibility: string;
  published: boolean;
  author: string | null;
  createdAt: string;
  publishedAt: string | null;
};

export function ReviewNotes({
  applicationId,
  reference,
  notes,
}: {
  applicationId: string;
  reference: string;
  notes: Note[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [internalBody, setInternalBody] = useState("");
  const [internalError, setInternalError] = useState<string | null>(null);
  const [savingInternal, setSavingInternal] = useState(false);

  const [feedbackBody, setFeedbackBody] = useState("");
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [confirmFeedback, setConfirmFeedback] = useState(false);

  const internalNotes = notes.filter((note) => note.visibility === "INTERNAL");
  const feedbackNotes = notes.filter((note) => note.visibility === "APPLICANT");

  async function addInternal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingInternal) return;
    setInternalError(null);
    setSavingInternal(true);
    try {
      await apiFetch(`/api/admin/applications/${applicationId}/notes`, {
        method: "POST",
        body: { body: internalBody },
      });
      setInternalBody("");
      toast.push({ title: "Internal note saved", description: "Visible to admins only.", tone: "success" });
      router.refresh();
    } catch (error) {
      setInternalError(
        error instanceof ApiClientError ? error.message : "Could not save the note. Please try again.",
      );
    } finally {
      setSavingInternal(false);
    }
  }

  async function publishFeedback() {
    if (savingFeedback) return;
    setFeedbackError(null);
    setSavingFeedback(true);
    try {
      await apiFetch(`/api/admin/applications/${applicationId}/feedback`, {
        method: "POST",
        body: { body: feedbackBody },
      });
      setFeedbackBody("");
      setConfirmFeedback(false);
      toast.push({
        title: "Feedback published",
        description: "The applicant can now see this note.",
        tone: "success",
      });
      router.refresh();
    } catch (error) {
      setFeedbackError(
        error instanceof ApiClientError ? error.message : "Could not publish feedback.",
      );
      setConfirmFeedback(false);
    } finally {
      setSavingFeedback(false);
    }
  }

  function tryPublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!feedbackBody.trim()) {
      setFeedbackError("Write feedback first.");
      return;
    }
    setConfirmFeedback(true);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="card flex flex-col p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-amber-300/20 bg-amber-300/[0.08] text-amber-200">
            <LockIcon size={14} />
          </span>
          <div>
            <h2 className="font-display text-[14px] font-semibold text-snow">Internal notes</h2>
            <p className="text-[9.5px] text-muted">Never returned to member endpoints.</p>
          </div>
          <span className="ml-auto rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] text-muted">
            {internalNotes.length}
          </span>
        </div>

        <form onSubmit={addInternal} className="mt-4">
          {internalError ? (
            <div className="mb-2.5">
              <Alert tone="danger">{internalError}</Alert>
            </div>
          ) : null}
          <textarea
            value={internalBody}
            onChange={(event) => setInternalBody(event.target.value)}
            placeholder="Private context for the review team…"
            className="textarea min-h-[92px]"
            maxLength={4000}
            aria-label="Internal note"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[9px] text-muted">{internalBody.length}/4000</span>
            <button
              type="submit"
              className="btn btn-secondary btn-sm"
              disabled={savingInternal || !internalBody.trim()}
            >
              {savingInternal ? <Spinner size={13} /> : <MessageIcon size={13} />}
              {savingInternal ? "Saving…" : "Add internal note"}
            </button>
          </div>
        </form>

        <div className="mt-4 flex-1 space-y-2.5 overflow-y-auto border-t border-white/7 pt-3.5 xl:max-h-[320px]">
          {internalNotes.length === 0 ? (
            <EmptyState
              compact
              icon={<LockIcon size={18} />}
              title="No internal notes"
              description="Notes added here stay private forever."
            />
          ) : (
            internalNotes.map((note) => (
              <article key={note.id} className="rounded-xl border border-amber-300/10 bg-amber-300/[0.035] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-amber-200/80">
                    Internal
                  </span>
                  <span className="text-[8.5px] text-muted">{formatDateTime(note.createdAt)}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-[11.5px] leading-relaxed text-mist">
                  {note.body}
                </p>
                <p className="mt-1.5 text-[8.5px] text-muted">{note.author ?? "Unknown admin"}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="card flex flex-col p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300">
            <EyeIcon size={14} />
          </span>
          <div>
            <h2 className="font-display text-[14px] font-semibold text-snow">Applicant feedback</h2>
            <p className="text-[9.5px] text-muted">Publishing is immediate and permanent.</p>
          </div>
          <span className="ml-auto rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] text-muted">
            {feedbackNotes.length}
          </span>
        </div>

        <form onSubmit={tryPublish} className="mt-4">
          {feedbackError ? (
            <div className="mb-2.5">
              <Alert tone="danger">{feedbackError}</Alert>
            </div>
          ) : null}
          <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.035] p-3">
            <p className="flex items-start gap-1.5 text-[9.5px] leading-relaxed text-emerald-200/80">
              <ShieldCheckIcon size={11} className="mt-0.5 shrink-0" />
              This message appears in {reference}. Only publish intentional, professional feedback.
            </p>
          </div>
          <textarea
            value={feedbackBody}
            onChange={(event) => setFeedbackBody(event.target.value)}
            placeholder="What would you like the applicant to know?"
            className="textarea mt-2 min-h-[92px]"
            maxLength={4000}
            aria-label="Applicant feedback"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[9px] text-muted">{feedbackBody.length}/4000</span>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={savingFeedback || !feedbackBody.trim()}
            >
              {savingFeedback ? <Spinner size={13} /> : <SendIcon size={13} />}
              {savingFeedback ? "Publishing…" : "Publish feedback"}
            </button>
          </div>
        </form>

        <div className="mt-4 flex-1 space-y-2.5 overflow-y-auto border-t border-white/7 pt-3.5 xl:max-h-[320px]">
          {feedbackNotes.length === 0 ? (
            <EmptyState
              compact
              icon={<MessageIcon size={18} />}
              title="Nothing published"
              description="The applicant sees a calm empty state, not your internal notes."
            />
          ) : (
            feedbackNotes.map((note) => (
              <article key={note.id} className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.03] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-emerald-300/80">
                    Published
                  </span>
                  <span className="text-[8.5px] text-muted">
                    {formatDateTime(note.publishedAt ?? note.createdAt)}
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-[11.5px] leading-relaxed text-mist">
                  {note.body}
                </p>
                <p className="mt-1.5 text-[8.5px] text-muted">{note.author ?? "Unknown admin"}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <ConfirmDialog
        open={confirmFeedback}
        onClose={() => setConfirmFeedback(false)}
        onConfirm={publishFeedback}
        title="Publish this feedback?"
        description={`This note becomes visible to the applicant in ${reference} immediately. It cannot be unpublished from this screen.`}
        confirmLabel="Publish to applicant"
        tone="primary"
      />
    </div>
  );
}
