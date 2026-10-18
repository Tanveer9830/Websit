import { addInternalNote } from "@/lib/applications";
import { audit } from "@/lib/audit";
import { assertMutation, handle, json, parseBody, requireAdmin } from "@/lib/api";
import { internalNoteSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  return handle("admin.applications.notes", async () => {
    assertMutation(req);
    const auth = await requireAdmin(req, "REVIEW_APPLICATIONS");
    const { id } = await context.params;
    const input = await parseBody(req, internalNoteSchema);

    const note = await addInternalNote({
      applicationId: id,
      authorId: auth.user.id,
      body: input.body,
    });

    await audit({
      actorId: auth.user.id,
      actorLabel: auth.user.username,
      action: "APPLICATION_NOTE_ADDED",
      targetType: "Application",
      targetId: id,
      metadata: { noteId: note.id },
    });

    return json(
      {
        note: {
          id: note.id,
          body: note.body,
          visibility: note.visibility,
          published: note.published,
          author: auth.user.username,
          createdAt: note.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  });
}
