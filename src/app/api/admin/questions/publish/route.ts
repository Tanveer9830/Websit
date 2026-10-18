import { publishDraftForm } from "@/lib/form";
import { audit } from "@/lib/audit";
import { assertMutation, handle, json, requireAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle("admin.questions.publish", async () => {
    assertMutation(req);
    const auth = await requireAdmin(req, "MANAGE_QUESTIONS");
    const result = await publishDraftForm(auth.user.id);

    await audit({
      actorId: auth.user.id,
      actorLabel: auth.user.username,
      action: "FORM_PUBLISHED",
      targetType: "FormVersion",
      targetId: String(result.publishedVersion),
      metadata: {
        version: result.publishedVersion,
        enabledQuestions: result.questionCount,
      },
    });

    return json({
      ok: true,
      ...result,
      message: `Form version ${result.publishedVersion} is live. A fresh draft is ready for the next change.`,
    });
  });
}
