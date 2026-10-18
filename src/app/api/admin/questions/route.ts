import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { formVersions, questions, type QuestionRow } from "@/db/schema";
import { ensureDraftForm, publishValidationErrors, serializeQuestion } from "@/lib/form";
import { audit } from "@/lib/audit";
import { assertMutation, handle, json, parseBody, requireAdmin } from "@/lib/api";
import { questionInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

function signature(questionList: QuestionRow[]): string {
  return JSON.stringify(
    questionList.map((question) => ({
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
}

export async function GET(req: Request) {
  return handle("admin.questions.list", async () => {
    await requireAdmin(req, "MANAGE_QUESTIONS");
    const draft = await ensureDraftForm();

    const [publishedRows, draftRows, draftQuestions] = await Promise.all([
      db
        .select()
        .from(formVersions)
        .where(eq(formVersions.status, "PUBLISHED"))
        .orderBy(desc(formVersions.version))
        .limit(1),
      db.select().from(formVersions).where(eq(formVersions.id, draft.id)).limit(1),
      db
        .select()
        .from(questions)
        .where(eq(questions.formVersionId, draft.id))
        .orderBy(asc(questions.order)),
    ]);

    const published = publishedRows[0];
    const publishedQuestions = published
      ? await db
          .select()
          .from(questions)
          .where(eq(questions.formVersionId, published.id))
          .orderBy(asc(questions.order))
      : [];
    const changed = !published || signature(draftQuestions) !== signature(publishedQuestions);

    return json({
      draft: {
        id: draft.id,
        version: draft.version,
        questions: draft.questions,
        updatedAt: (draftRows[0]?.updatedAt ?? new Date()).toISOString(),
      },
      published: published
        ? {
            version: published.version,
            publishedAt: published.publishedAt?.toISOString() ?? null,
            enabledQuestions: publishedQuestions.filter((question) => question.enabled).length,
          }
        : null,
      hasUnpublishedChanges: changed,
      publishErrors: publishValidationErrors(draftQuestions),
    });
  });
}

export async function POST(req: Request) {
  return handle("admin.questions.create", async () => {
    assertMutation(req);
    const auth = await requireAdmin(req, "MANAGE_QUESTIONS");
    const input = await parseBody(req, questionInputSchema);
    const draft = await ensureDraftForm();

    const maxRows = await db
      .select({ max: sql<number | null>`max(${questions.order})` })
      .from(questions)
      .where(eq(questions.formVersionId, draft.id));

    const [question] = await db
      .insert(questions)
      .values({
        formVersionId: draft.id,
        type: input.type,
        title: input.title,
        description: input.description ?? "",
        placeholder: input.placeholder ?? "",
        required: input.required ?? true,
        enabled: input.enabled ?? true,
        options: JSON.stringify(
          ["SELECT", "RADIO", "CHECKBOX"].includes(input.type) ? (input.options ?? []) : [],
        ),
        order: Number(maxRows[0]?.max ?? -1) + 1,
      })
      .returning();
    await db.update(formVersions).set({ updatedAt: new Date() }).where(eq(formVersions.id, draft.id));

    await audit({
      actorId: auth.user.id,
      actorLabel: auth.user.username,
      action: "QUESTION_CREATED",
      targetType: "Question",
      targetId: question!.id,
      metadata: { title: question!.title, type: question!.type },
    });

    return json({ question: serializeQuestion(question!) }, { status: 201 });
  });
}
