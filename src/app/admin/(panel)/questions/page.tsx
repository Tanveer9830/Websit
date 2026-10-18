import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { formVersions, questions } from "@/db/schema";
import { requireAdminPage } from "@/lib/page-auth";
import { hasPermission } from "@/lib/permissions";
import { ensureDraftForm } from "@/lib/form";
import { QUESTION_TYPE_META } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { AccessDenied } from "@/components/admin/access-denied";
import { QuestionBuilder } from "@/components/admin/question-builder";
import { PageHeader } from "@/components/ui/page-header";
import { LayersIcon, ShieldCheckIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Form builder" };

function signature(rows: { type: string; title: string; description: string; placeholder: string; required: boolean; enabled: boolean; options: string; order: number }[]) {
  return JSON.stringify(rows.map((row) => ({ ...row })));
}

export default async function AdminQuestionsPage() {
  const auth = await requireAdminPage("/admin/questions");
  if (!hasPermission(auth.user, "MANAGE_QUESTIONS")) {
    return <AccessDenied title="The form builder is restricted." />;
  }

  const draft = await ensureDraftForm();
  const publishedRows = await db
    .select()
    .from(formVersions)
    .where(eq(formVersions.status, "PUBLISHED"))
    .orderBy(desc(formVersions.version))
    .limit(1);
  const published = publishedRows[0];
  const publishedQuestions = published
    ? await db
        .select()
        .from(questions)
        .where(eq(questions.formVersionId, published.id))
        .orderBy(asc(questions.order))
    : [];

  const hasChanges = !published || signature(
    draft.questions.map((question) => ({
      type: question.type,
      title: question.title,
      description: question.description,
      placeholder: question.placeholder,
      required: question.required,
      enabled: question.enabled,
      options: JSON.stringify(question.options),
      order: question.order,
    })),
  ) !== signature(
    publishedQuestions.map((question) => ({
      type: question.type,
      title: question.title,
      description: question.description,
      placeholder: question.placeholder,
      required: question.required,
      enabled: question.enabled,
      options: question.options,
      order: question.order,
    })),
  );

  const enabled = draft.questions.filter((question) => question.enabled);
  const publishReady =
    enabled.length > 0 &&
    enabled.every(
      (question) =>
        !QUESTION_TYPE_META[question.type].hasOptions || question.options.length >= 2,
    );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Dynamic form"
        title="Question builder."
        description="Design the form members fill out. Draft edits are private until published; every submission snapshots the exact questions and options it was answered against."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] text-mist">
            <ShieldCheckIcon size={12} className="text-emerald-300" />
            Changes audited
          </span>
        }
      />

      <QuestionBuilder
        draftVersion={draft.version}
        questions={draft.questions}
        published={
          published
            ? {
                version: published.version,
                publishedAt: published.publishedAt?.toISOString() ?? null,
                enabledQuestions: publishedQuestions.filter((question) => question.enabled).length,
              }
            : null
        }
        hasChanges={hasChanges}
        publishReady={publishReady}
      />

      <section className="card p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brand/10 text-brand-bright">
            <LayersIcon size={16} />
          </span>
          <div>
            <h2 className="font-display text-[14px] font-semibold text-snow">How publishing works</h2>
            <p className="mt-1 text-[10.5px] leading-relaxed text-mist">
              Publishing freezes the draft as a numbered live version and immediately creates a fresh draft copy. The
              live form changes instantly for new applications; existing applications continue to show their original
              question text, options and order. Disabled questions stay in the draft but are hidden from members.
            </p>
            <p className="mt-2 text-[9.5px] text-muted">
              Live since {published?.publishedAt ? formatDateTime(published.publishedAt) : "never"} · Draft v
              {draft.version} · {draft.questions.length} question{draft.questions.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
