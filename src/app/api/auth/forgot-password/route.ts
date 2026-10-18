import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { issueAuthToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { checkRateLimit, recordRateLimitHit } from "@/lib/rate-limit";
import { getClientIp, hashIp, sha256 } from "@/lib/request";
import { assertMutation, handle, json, parseBody, rateLimited } from "@/lib/api";
import { forgotPasswordSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const GENERIC = "If an account exists for that email, a reset link is on its way.";

export async function POST(req: Request) {
  return handle("auth.forgot-password", async () => {
    assertMutation(req);
    const ip = getClientIp(req);
    const input = await parseBody(req, forgotPasswordSchema);
    const email = input.email.toLowerCase();
    const emailKey = `reset:email:${sha256(email).slice(0, 20)}`;
    const ipKey = `reset:ip:${hashIp(ip)}`;

    const [emailState, ipState] = await Promise.all([
      checkRateLimit(emailKey, 5, 60 * 60),
      checkRateLimit(ipKey, 15, 60 * 60),
    ]);
    if (!emailState.allowed || !ipState.allowed) {
      return rateLimited(Math.max(emailState.retryAfterSeconds, ipState.retryAfterSeconds));
    }

    await Promise.all([
      recordRateLimitHit(emailKey, 60 * 60),
      recordRateLimitHit(ipKey, 60 * 60),
    ]);

    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];
    if (user && !user.isDisabled) {
      const { token } = await issueAuthToken(user.id, "PASSWORD_RESET");
      await sendPasswordResetEmail({ to: user.email, username: user.username, token });
      await audit({
        actorId: user.id,
        actorLabel: user.username,
        action: "PASSWORD_RESET_REQUESTED",
        ip,
      });
    }

    return json({ ok: true, message: GENERIC });
  });
}
