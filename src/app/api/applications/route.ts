import { getPublishedForm } from "@/lib/form";
import { getSettings } from "@/lib/settings";
import { submitApplication } from "@/lib/applications";
import { audit } from "@/lib/audit";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { ApiError, assertMutation, handle, json, parseBody, rateLimited, requireUser } from "@/lib/api";
import { applicationSubmitSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle("applications.submit", async () => {
    assertMutation(req);
    const auth = await requireUser(req);
    const ip = getClientIp(req);

    const limit = await consumeRateLimit(`apply:user:${auth.user.id}`, 5, 60 * 60);
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

    const input = await parseBody(req, applicationSubmitSchema);
    const [form, settings] = await Promise.all([getPublishedForm(), getSettings()]);
    if (!form) {
      throw new ApiError(409, "FORM_UNAVAILABLE", "The application form is not available yet. Please check back soon.");
    }

    const application = await submitApplication({
      user: auth.user,
      input,
      form,
      settings,
    });

    await audit({
      actorId: auth.user.id,
      actorLabel: auth.user.username,
      action: "APPLICATION_SUBMITTED",
      targetType: "Application",
      targetId: application.id,
      metadata: { reference: application.reference, position: input.position ?? null, formVersion: form.version },
      ip,
    });

    return json(
      {
        application,
        message: "Application submitted. Keep your reference number safe.",
      },
      { status: 201 },
    );
  });
}
