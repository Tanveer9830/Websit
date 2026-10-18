import { eq } from "drizzle-orm";
import { db } from "@/db";
import { formVersions, questions } from "@/db/schema";
import { serializeQuestion } from "@/lib/form";
import { audit } from "@/lib/audit";
import { ApiError, assertMutation, handle, json, parseBody, requireAdmin } from "@/lib/api";
import { questionInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

async function getDraftQuestion(id: string) {
  const rows = await db
    .select({
      question: questions,
      formVersionId: formVersions.id,
      formStatus: formVersions.status,
    })
    .from(questions)
    .innerJoin(formVersions, eq(questions.formVersionId, formVersions.id))
    .where(eq(questions.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) throw new ApiError(404, "NOT_FOUND", "Question not found.");
  if (row.formStatus !== "DRAFT") {
    throw new ApiError(409, "IMMUTABLE", "Published form versions are immutable. Edit the current draft instead.");
  }
  return row;
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  return handle("admin.questions.update", async () => {
    assertMutation(req);
    const auth = await requireAdmin(req, "MANAGE_QUESTIONS");
    const { id } = await context.params;
    const input = await parseBody(req, questionInputSchema);
    const existing = await getDraftQuestion(id);

    const [updated] = await db
      .update(questions)
      .set({
        type: input.type,
        title: input.title,
        description: input.description ?? "",
        placeholder: input.placeholder ?? "",
        required: input.required ?? true,
        enabled: input.enabled ?? true,
        options: JSON.stringify(
          ["SELECT", "RADIO", "CHECKBOX"].includes(input.type) ? (input.options ?? []) : [],
        ),
      })
      .where(eq(questions.id, id))
      .returning();

    await db
      .update(formVersions)
      .set({ updatedAt: new Date() })
      .where(eq(formVersions.id, existing.formVersionId));

    await audit({
      actorId: auth.user.id,
      actorLabel: auth.user.username,
      action: "QUESTION_UPDATED",
      targetType: "Question",
      targetId: updated!.id,
      metadata: { title: updated!.title, type: updated!.type, enabled: updated!.enabled },
    });

    return json({ question: serializeQuestion(updated!) });
  });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  return handle("admin.questions.delete", async () => {
    assertMutation(req);
    const auth = await requireAdmin(req, "MANAGE_QUESTIONS");
    const { id } = await context.params;
    const existing = await getDraftQuestion(id);

    await db.delete(questions).where(eq(questions.id, id));
    await db
      .update(formVersions)
      .set({ updatedAt: new Date() })
      .where(eq(formVersions.id, existing.formVersionId));

    await audit({
      actorId: auth.user.id,
      actorLabel: auth.user.username,
      action: "QUESTION_DELETED",
      targetType: "Question",
      targetId: id,
      metadata: { title: existing.question.title, type: existing.question.type },
    });

    return json({ ok: true, deletedId: id });
  });
}
