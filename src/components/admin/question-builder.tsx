"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import {
  QUESTION_TYPES,
  QUESTION_TYPE_META,
  type QuestionType,
} from "@/lib/constants";
import type { FormQuestion } from "@/lib/form";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  ChevronUpIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClipboardIcon,
  CopyIcon,
  EyeIcon,
  GripIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  SparklesIcon,
  TrashIcon,
} from "@/components/ui/icons";

type EditorState = {
  mode: "create" | "edit";
  id?: string;
  type: QuestionType;
  title: string;
  description: string;
  placeholder: string;
  required: boolean;
  enabled: boolean;
  optionsText: string;
};

const BLANK: EditorState = {
  mode: "create",
  type: "SHORT_TEXT",
  title: "",
  description: "",
  placeholder: "",
  required: true,
  enabled: true,
  optionsText: "",
};

function payloadFrom(editor: EditorState) {
  const options = editor.optionsText
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean);
  return {
    type: editor.type,
    title: editor.title.trim(),
    description: editor.description.trim(),
    placeholder: editor.placeholder.trim(),
    required: editor.required,
    enabled: editor.enabled,
    options: QUESTION_TYPE_META[editor.type].hasOptions ? options : [],
  };
}

function fullPayload(question: FormQuestion) {
  return {
    type: question.type,
    title: question.title,
    description: question.description,
    placeholder: question.placeholder,
    required: question.required,
    enabled: question.enabled,
    options: question.options,
  };
}

export function QuestionBuilder({
  draftVersion,
  questions,
  published,
  hasChanges,
  publishReady,
}: {
  draftVersion: number;
  questions: FormQuestion[];
  published: { version: number; publishedAt: string | null; enabledQuestions: number } | null;
  hasChanges: boolean;
  publishReady: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [items, setItems] = useState(questions);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorFields, setEditorFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishErrors, setPublishErrors] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<FormQuestion | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setItems(questions);
  }, [questions]);

  function openCreate() {
    setEditor({ ...BLANK });
    setEditorError(null);
    setEditorFields({});
  }

  function openEdit(question: FormQuestion) {
    setEditor({
      mode: "edit",
      id: question.id,
      type: question.type,
      title: question.title,
      description: question.description,
      placeholder: question.placeholder,
      required: question.required,
      enabled: question.enabled,
      optionsText: question.options.join("\n"),
    });
    setEditorError(null);
    setEditorFields({});
  }

  async function saveQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || saving) return;
    setEditorError(null);
    setEditorFields({});
    const payload = payloadFrom(editor);
    if (payload.title.length < 2) {
      setEditorFields({ title: "Question title is required." });
      return;
    }
    if (QUESTION_TYPE_META[editor.type].hasOptions && payload.options.length < 2) {
      setEditorFields({ options: "Add at least two answer options, one per line." });
      return;
    }
    setSaving(true);
    try {
      if (editor.mode === "create") {
        await apiFetch("/api/admin/questions", { method: "POST", body: payload });
        toast.push({ title: "Question added", description: "Saved to the draft form.", tone: "success" });
      } else {
        await apiFetch(`/api/admin/questions/${editor.id}`, { method: "PATCH", body: payload });
        toast.push({ title: "Question updated", description: "Saved to the draft form.", tone: "success" });
      }
      setEditor(null);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setEditorError(error.message);
        setEditorFields(error.fields);
      } else {
        setEditorError("Could not save the question. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function duplicate(question: FormQuestion) {
    if (busyId) return;
    setBusyId(question.id);
    try {
      await apiFetch("/api/admin/questions", {
        method: "POST",
        body: {
          ...fullPayload(question),
          title: `${question.title} (copy)`.slice(0, 160),
        },
      });
      toast.push({ title: "Question duplicated", tone: "success" });
      router.refresh();
    } catch (error) {
      toast.push({
        title: "Could not duplicate",
        description: error instanceof Error ? error.message : "Please try again.",
        tone: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function toggleEnabled(question: FormQuestion) {
    if (busyId) return;
    setBusyId(question.id);
    try {
      await apiFetch(`/api/admin/questions/${question.id}`, {
        method: "PATCH",
        body: { ...fullPayload(question), enabled: !question.enabled },
      });
      router.refresh();
    } catch (error) {
      toast.push({
        title: "Could not update question",
        description: error instanceof Error ? error.message : "Please try again.",
        tone: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function removeQuestion() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await apiFetch(`/api/admin/questions/${deleteTarget.id}`, { method: "DELETE" });
      toast.push({ title: "Question deleted", description: "Removed from the draft.", tone: "success" });
      setDeleteTarget(null);
      router.refresh();
    } catch (error) {
      toast.push({
        title: "Could not delete",
        description: error instanceof Error ? error.message : "Please try again.",
        tone: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length || busyId) return;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    setItems(next);
    setBusyId(item!.id);
    try {
      await apiFetch("/api/admin/questions/reorder", {
        method: "POST",
        body: { ids: next.map((question) => question.id) },
      });
      router.refresh();
    } catch (error) {
      setItems(items);
      toast.push({
        title: "Could not reorder",
        description: error instanceof Error ? error.message : "Please refresh and try again.",
        tone: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function publish() {
    if (publishing) return;
    setPublishing(true);
    setPublishErrors([]);
    try {
      const data = await apiFetch<{ message: string; publishedVersion: number }>(
        "/api/admin/questions/publish",
        { method: "POST" },
      );
      toast.push({
        title: `Form v${data.publishedVersion} is live`,
        description: "A fresh draft is ready for future edits.",
        tone: "success",
      });
      setPublishOpen(false);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        const details = error.details as { errors?: string[] } | null;
        setPublishErrors(details?.errors ?? [error.message]);
      } else {
        setPublishErrors(["Could not publish the form. Please try again."]);
      }
      setPublishOpen(false);
    } finally {
      setPublishing(false);
    }
  }

  const enabledCount = items.filter((question) => question.enabled).length;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(120deg,rgba(139,92,246,0.12),rgba(59,130,246,0.05))] p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-brand/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-mist">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-bright" />
                Draft v{draftVersion}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live v{published?.version ?? "—"}
              </span>
              {hasChanges ? (
                <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-200">
                  Unpublished changes
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Draft matches live
                </span>
              )}
            </div>
            <h2 className="mt-2.5 font-display text-lg font-semibold text-snow">Build the live application form.</h2>
            <p className="mt-1 max-w-xl text-[11.5px] leading-relaxed text-mist">
              Edits save to the draft instantly. Members only see a version after you publish it — and every past
              submission keeps its original question snapshot forever.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPreviewOpen(true)} className="btn btn-secondary btn-sm">
              <EyeIcon size={14} />
              Preview
            </button>
            <button type="button" onClick={openCreate} className="btn btn-secondary btn-sm">
              <PlusIcon size={14} />
              Add question
            </button>
            <button
              type="button"
              onClick={() => setPublishOpen(true)}
              className="btn btn-primary btn-sm"
              disabled={!publishReady}
              title={publishReady ? "Publish draft" : "Fix the form before publishing"}
            >
              <SendIcon size={14} />
              Publish v{draftVersion}
            </button>
          </div>
        </div>
      </section>

      {publishErrors.length > 0 ? (
        <Alert tone="danger" title="The form isn't ready to publish">
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {publishErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Questions in draft", value: items.length, icon: <LayersIcon size={14} /> },
          { label: "Enabled on publish", value: enabledCount, icon: <CheckCircleIcon size={14} /> },
          { label: "Live questions", value: published?.enabledQuestions ?? 0, icon: <SparklesIcon size={14} /> },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-brand-bright">
              {stat.icon}
            </span>
            <div>
              <p className="font-display text-lg font-semibold leading-none text-snow">{stat.value}</p>
              <p className="mt-1 text-[9.5px] uppercase tracking-[0.1em] text-muted">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="card p-5">
          <EmptyState
            icon={<ClipboardIcon size={24} />}
            title="Start with your first question"
            description="Add a short text, paragraph, dropdown, checkboxes, email, number or yes/no question. Publish when the draft is ready."
            action={
              <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
                <PlusIcon size={14} /> Add a question
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((question, index) => {
            const meta = QUESTION_TYPE_META[question.type];
            const busy = busyId === question.id;
            return (
              <article
                key={question.id}
                className={`card p-4 transition ${question.enabled ? "" : "opacity-65"} ${busy ? "pointer-events-none" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/8 bg-white/[0.03] font-mono text-[10px] text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <GripIcon size={12} className="text-white/15" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded border border-brand/20 bg-brand/10 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-brand-bright">
                        {meta.label}
                      </span>
                      {question.required ? (
                        <span className="rounded border border-rose-400/20 bg-rose-400/[0.07] px-1.5 py-0.5 text-[8.5px] font-medium uppercase tracking-wide text-rose-300">
                          Required
                        </span>
                      ) : (
                        <span className="rounded border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[8.5px] uppercase tracking-wide text-muted">
                          Optional
                        </span>
                      )}
                      {!question.enabled ? (
                        <span className="rounded border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[8.5px] uppercase tracking-wide text-muted">
                          Hidden
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-1.5 text-[13px] font-medium leading-snug text-snow">{question.title}</h3>
                    {question.description ? (
                      <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-relaxed text-muted">
                        {question.description}
                      </p>
                    ) : null}
                    {meta.hasOptions && question.options.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {question.options.slice(0, 5).map((option) => (
                          <span
                            key={option}
                            className="rounded-md border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[9px] text-mist"
                          >
                            {option}
                          </span>
                        ))}
                        {question.options.length > 5 ? (
                          <span className="px-1 text-[9px] text-muted">+{question.options.length - 5} more</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="icon-btn"
                      aria-label="Move up"
                    >
                      <ChevronUpIcon size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                      className="icon-btn"
                      aria-label="Move down"
                    >
                      <ChevronDownIcon size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleEnabled(question)}
                      className={`icon-btn ${question.enabled ? "text-emerald-300" : "text-muted"}`}
                      aria-label={question.enabled ? "Hide question" : "Enable question"}
                      title={question.enabled ? "Hide from published form" : "Show on published form"}
                    >
                      {question.enabled ? <EyeIcon size={13} /> : <EyeIcon size={13} className="opacity-40" />}
                    </button>
                    <button type="button" onClick={() => openEdit(question)} className="icon-btn" aria-label="Edit question">
                      <PencilIcon size={13} />
                    </button>
                    <button type="button" onClick={() => duplicate(question)} className="icon-btn" aria-label="Duplicate question">
                      <CopyIcon size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(question)}
                      className="icon-btn text-rose-300/70 hover:text-rose-300"
                      aria-label="Delete question"
                    >
                      <TrashIcon size={13} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={openCreate} className="btn btn-secondary btn-sm">
          <PlusIcon size={14} />
          Add another question
        </button>
        <p className="hidden items-center gap-1.5 text-[9.5px] text-muted sm:flex">
          <ChevronDownIcon size={11} />
          Changes are saved immediately to draft v{draftVersion}
        </p>
      </div>

      <Modal
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={editor?.mode === "create" ? "Add a question" : "Edit question"}
        description="Configure exactly what applicants will see. Only enabled questions appear in the live form."
        size="lg"
      >
        {editor ? (
          <form onSubmit={saveQuestion} className="space-y-4" noValidate>
            {editorError ? <Alert tone="danger">{editorError}</Alert> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="question-type" className="field-label">
                  <span>Answer type</span>
                </label>
                <select
                  id="question-type"
                  className="select"
                  value={editor.type}
                  onChange={(event) =>
                    setEditor({ ...editor, type: event.target.value as QuestionType })
                  }
                >
                  {QUESTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {QUESTION_TYPE_META[type].label}
                    </option>
                  ))}
                </select>
                <p className="form-hint">{QUESTION_TYPE_META[editor.type].description}</p>
              </div>
              <div>
                <label htmlFor="question-title" className="field-label">
                  <span>Question title</span>
                  <span className="text-[9.5px] font-normal text-muted">{editor.title.length}/160</span>
                </label>
                <input
                  id="question-title"
                  className={`input ${editorFields.title ? "input-error" : ""}`}
                  value={editor.title}
                  onChange={(event) => setEditor({ ...editor, title: event.target.value })}
                  placeholder="e.g. Which team are you applying for?"
                  maxLength={160}
                  required
                />
                {editorFields.title ? <p className="form-error">{editorFields.title}</p> : null}
              </div>
            </div>

            <div>
              <label htmlFor="question-description" className="field-label">
                <span>Description</span>
                <span className="text-[9.5px] font-normal text-muted">Optional · 500 max</span>
              </label>
              <textarea
                id="question-description"
                className="textarea min-h-[70px]"
                value={editor.description}
                onChange={(event) => setEditor({ ...editor, description: event.target.value })}
                placeholder="Context that helps applicants answer well."
                maxLength={500}
              />
            </div>

            <div>
              <label htmlFor="question-placeholder" className="field-label">
                <span>Placeholder</span>
                <span className="text-[9.5px] font-normal text-muted">Optional</span>
              </label>
              <input
                id="question-placeholder"
                className="input"
                value={editor.placeholder}
                onChange={(event) => setEditor({ ...editor, placeholder: event.target.value })}
                placeholder="e.g. A few sentences is perfect"
                maxLength={120}
              />
            </div>

            {QUESTION_TYPE_META[editor.type].hasOptions ? (
              <div>
                <label htmlFor="question-options" className="field-label">
                  <span>Answer options</span>
                  <span className="text-[9.5px] font-normal text-muted">One per line · minimum 2</span>
                </label>
                <textarea
                  id="question-options"
                  className={`textarea min-h-[120px] font-mono text-[12px] ${editorFields.options ? "input-error" : ""}`}
                  value={editor.optionsText}
                  onChange={(event) => setEditor({ ...editor, optionsText: event.target.value })}
                  placeholder={"Community Support\nModeration\nEngineering\nDesign & Content"}
                />
                {editorFields.options ? <p className="form-error">{editorFields.options}</p> : null}
                <p className="form-hint">
                  {editor.optionsText.split("\n").filter((option) => option.trim()).length} option(s). Blank lines are
                  ignored; duplicates are rejected by the server.
                </p>
              </div>
            ) : null}

            <div className="grid gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] p-3.5 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={editor.required}
                  onChange={(event) => setEditor({ ...editor, required: event.target.checked })}
                  className="mt-0.5 h-4 w-4"
                />
                <span>
                  <span className="block text-[11.5px] font-medium text-mist">Required</span>
                  <span className="block text-[9.5px] leading-relaxed text-muted">
                    Applicants must answer before submitting.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={editor.enabled}
                  onChange={(event) => setEditor({ ...editor, enabled: event.target.checked })}
                  className="mt-0.5 h-4 w-4"
                />
                <span>
                  <span className="block text-[11.5px] font-medium text-mist">Enabled</span>
                  <span className="block text-[9.5px] leading-relaxed text-muted">
                    Show this question on the next published form.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-white/8 pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setEditor(null)} className="btn btn-secondary" disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <Spinner size={15} /> : <CheckCircleIcon size={15} />}
                {saving ? "Saving…" : editor.mode === "create" ? "Add to draft" : "Save changes"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Live form preview"
        description="This is what applicants will see once you publish. Disabled questions are omitted."
        size="lg"
      >
        <div className="space-y-5">
          {items.filter((question) => question.enabled).length === 0 ? (
            <EmptyState compact title="No enabled questions" description="Enable at least one question to preview the form." />
          ) : (
            items
              .filter((question) => question.enabled)
              .map((question, index) => (
                <div key={question.id}>
                  <p className="flex items-start gap-1.5 text-[12.5px] font-medium text-snow">
                    <span className="font-mono text-[9px] text-muted">{index + 1}.</span>
                    {question.title}
                    {question.required ? <span className="text-rose-300">*</span> : null}
                  </p>
                  {question.description ? (
                    <p className="mt-0.5 text-[10.5px] text-muted">{question.description}</p>
                  ) : null}
                  <PreviewField question={question} />
                </div>
              ))
          )}
          <p className="border-t border-white/8 pt-3 text-[9.5px] text-muted">
            Preview only. Answers are validated again on the server at submission.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onConfirm={publish}
        title={`Publish draft v${draftVersion}?`}
        description={`${enabledCount} enabled question${enabledCount === 1 ? "" : "s"} will go live for every member immediately. Existing applications keep their original snapshot. A fresh draft will be created for future edits.`}
        confirmLabel="Publish form"
        tone="primary"
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={removeQuestion}
        title="Delete this question?"
        description={`“${deleteTarget?.title ?? ""}” will be removed from the draft. Past applications are unaffected because their answers are snapshotted.`}
        confirmLabel="Delete question"
        tone="danger"
      />
    </div>
  );
}

function PreviewField({ question }: { question: FormQuestion }) {
  const disabled = "pointer-events-none opacity-70";
  if (question.type === "LONG_TEXT") {
    return <div className={`textarea mt-2 min-h-[70px] text-[11px] text-muted ${disabled}`}>{question.placeholder || "Long answer…"}</div>;
  }
  if (question.type === "SELECT") {
    return <div className={`input mt-2 text-[11px] text-muted ${disabled}`}>{question.placeholder || "Choose an option…"} ▾</div>;
  }
  if (question.type === "RADIO" || question.type === "CHECKBOX") {
    return (
      <div className={`mt-2 grid gap-1.5 ${question.type === "CHECKBOX" ? "sm:grid-cols-2" : ""}`}>
        {question.options.map((option) => (
          <span key={option} className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2 text-[10.5px] text-muted">
            <span className={`h-3 w-3 border border-white/20 ${question.type === "RADIO" ? "rounded-full" : "rounded-sm"}`} />
            {option}
          </span>
        ))}
      </div>
    );
  }
  if (question.type === "YES_NO") {
    return (
      <div className="mt-2 flex gap-1.5">
        {["Yes", "No"].map((option) => (
          <span key={option} className="flex-1 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2 text-center text-[10.5px] text-muted">
            {option}
          </span>
        ))}
      </div>
    );
  }
  return <div className={`input mt-2 text-[11px] text-muted ${disabled}`}>{question.placeholder || "Short answer"}</div>;
}
