import { issueAuthToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assertMutation, handle, json, requireUser, rateLimited } from "@/lib/api";
import { ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle("auth.resend-verification", async () => {
    assertMutation(req);
    const auth = await requireUser(req);
    if (auth.user.emailVerifiedAt) {
      throw new ApiError(400, "ALREADY_VERIFIED", "Your email is already verified.");
    }

    const limit = await consumeRateLimit(`verify:resend:${auth.user.id}`, 3, 60 * 60);
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

    const { token } = await issueAuthToken(auth.user.id, "EMAIL_VERIFY");
    const result = await sendVerificationEmail({
      to: auth.user.email,
      username: auth.user.username,
      token,
    });

    return json({
      ok: true,
      emailSent: result.sent,
      message: result.sent
        ? "Verification email sent. Check your inbox."
        : "Email delivery is not configured on this server. Ask the owner to enable SMTP.",
    });
  });
}
