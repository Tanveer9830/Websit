import { updateApplicationStatus } from "@/lib/applications";
import { getSettings } from "@/lib/settings";
import { sendStatusUpdateEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { assertMutation, handle, json, parseBody, requireAdmin } from "@/lib/api";
import { statusUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  return handle("admin.applications.status", async () => {
    assertMutation(req);
    const auth = await requireAdmin(req, "REVIEW_APPLICATIONS");
    const { id } = await context.params;
    const input = await parseBody(req, statusUpdateSchema);

    const result = await updateApplicationStatus({
      applicationId: id,
      status: input.status,
      note: input.note,
      actor: { id: auth.user.id, username: auth.user.username },
    });

    await audit({
      actorId: auth.user.id,
      actorLabel: auth.user.username,
      action: "APPLICATION_STATUS_CHANGED",
      targetType: "Application",
      targetId: id,
      metadata: {
        reference: result.application.reference,
        from: result.previousStatus,
        to: input.status,
      },
      ip: getClientIp(req),
    });

    const settings = await getSettings();
    if (settings.notifyStatusEmail) {
      try {
        await sendStatusUpdateEmail({
          to: result.applicant.email,
          username: result.applicant.username,
          reference: result.application.reference,
          status: input.status,
        });
      } catch (error) {
        console.error("[top-cloud] status email failed", error instanceof Error ? error.message : "unknown");
      }
    }

    return json({
      ok: true,
      application: {
        id: result.application.id,
        reference: result.application.reference,
        status: result.application.status,
        lastStatusChangedAt: result.application.lastStatusChangedAt.toISOString(),
      },
    });
  });
}
