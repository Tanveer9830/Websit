import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { formVersions, questions } from "@/db/schema";
import { ensureDraftForm } from "@/lib/form";
import { audit } from "@/lib/audit";
import { ApiError, assertMutation, handle, json, parseBody, requireAdmin } from "@/lib/api";
import { reorderQuestionsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle("admin.questions.reorder", async () => {
    assertMutation(req);
    const auth = await requireAdmin(req, "MANAGE_QUESTIONS");
    const input = await parseBody(req, reorderQuestionsSchema);
    const draft = await ensureDraftForm();

    const rows = await db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.formVersionId, draft.id))
      .orderBy(asc(questions.order));
    const currentIds = new Set(rows.map((question) => question.id));
    const incoming = new Set(input.ids);
    if (incoming.size !== input.ids.length || incoming.size !== currentIds.size) {
      throw new ApiError(409, "CONFLICT", "The question list changed. Refresh the page and try again.");
    }
    for (const id of input.ids) {
      if (!currentIds.has(id)) {
        throw new ApiError(409, "CONFLICT", "The question list changed. Refresh the page and try again.");
      }
    }

    await db.transaction(async (tx) => {
      for (const [index, id] of input.ids.entries()) {
        await tx.update(questions).set({ order: index }).where(eq(questions.id, id));
      }
      await tx.update(formVersions).set({ updatedAt: new Date() }).where(eq(formVersions.id, draft.id));
    });

    await audit({
      actorId: auth.user.id,
      actorLabel: auth.user.username,
      action: "QUESTIONS_REORDERED",
      targetType: "FormVersion",
      targetId: draft.id,
      metadata: { count: input.ids.length },
    });

    return json({ ok: true });
  });
}
