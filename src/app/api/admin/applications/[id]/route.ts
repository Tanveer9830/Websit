import { getAdminApplication } from "@/lib/applications";
import { parseStoredAnswer } from "@/lib/form";
import { ApiError, handle, json, requireAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  return handle("admin.applications.detail", async () => {
    await requireAdmin(req, "REVIEW_APPLICATIONS");
    const { id } = await context.params;
    const detail = await getAdminApplication(id);
    if (!detail) throw new ApiError(404, "NOT_FOUND", "Application not found.");

    return json({
      application: {
        id: detail.application.id,
        reference: detail.application.reference,
        status: detail.application.status,
        position: detail.application.position,
        discordUsername: detail.application.discordUsername,
        discordId: detail.application.discordId,
        submittedAt: detail.application.submittedAt.toISOString(),
        updatedAt: detail.application.updatedAt.toISOString(),
        lastStatusChangedAt: detail.application.lastStatusChangedAt.toISOString(),
        formVersion: detail.formVersion,
        applicant: {
          ...detail.applicant,
          emailVerifiedAt: detail.applicant.emailVerifiedAt?.toISOString() ?? null,
          createdAt: detail.applicant.createdAt.toISOString(),
        },
        answers: detail.answers.map((answer) => ({
          id: answer.id,
          question: answer.questionTitle,
          description: answer.questionDescription,
          type: answer.questionType,
          required: answer.required,
          answer: parseStoredAnswer(answer.answer),
        })),
        history: detail.history.map((entry) => ({
          id: entry.id,
          from: entry.from,
          to: entry.to,
          note: entry.note,
          actor: entry.actor,
          at: entry.at.toISOString(),
        })),
        notes: detail.notes.map((note) => ({
          id: note.id,
          body: note.body,
          visibility: note.visibility,
          published: note.published,
          author: note.author,
          createdAt: note.createdAt.toISOString(),
          publishedAt: note.publishedAt?.toISOString() ?? null,
        })),
      },
    });
  });
}
