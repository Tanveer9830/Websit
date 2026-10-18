import { getMemberApplication } from "@/lib/applications";
import { parseStoredAnswer } from "@/lib/form";
import { ApiError, handle, json, requireUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  return handle("applications.detail", async () => {
    const auth = await requireUser(req);
    const { id } = await context.params;
    const application = await getMemberApplication(id, auth.user.id);
    if (!application) {
      throw new ApiError(404, "NOT_FOUND", "Application not found.");
    }

    return json({
      application: {
        id: application.id,
        reference: application.reference,
        status: application.status,
        position: application.position,
        submittedAt: application.submittedAt.toISOString(),
        updatedAt: application.updatedAt.toISOString(),
        formVersion: application.formVersion,
        answers: application.answers.map((answer) => ({
          id: answer.id,
          question: answer.questionTitle,
          description: answer.questionDescription,
          type: answer.questionType,
          required: answer.required,
          answer: parseStoredAnswer(answer.answer),
        })),
        history: application.history.map((entry) => ({
          status: entry.status,
          at: entry.at.toISOString(),
        })),
        feedback: application.feedback.map((note) => ({
          body: note.body,
          publishedAt: note.publishedAt?.toISOString() ?? null,
        })),
      },
    });
  });
}
