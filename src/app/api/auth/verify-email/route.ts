import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { consumeAuthToken } from "@/lib/tokens";
import { audit } from "@/lib/audit";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp, hashIp } from "@/lib/request";
import { ApiError, assertMutation, handle, json, parseBody, rateLimited } from "@/lib/api";
import { verifyEmailSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle("auth.verify-email", async () => {
    assertMutation(req);
    const ip = getClientIp(req);
    const limit = await consumeRateLimit(`verify:ip:${hashIp(ip)}`, 20, 60 * 60);
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

    const { token } = await parseBody(req, verifyEmailSchema);
    const user = await consumeAuthToken(token, "EMAIL_VERIFY");
    if (!user) {
      throw new ApiError(400, "INVALID_TOKEN", "This verification link is invalid or has expired.");
    }

    if (!user.emailVerifiedAt) {
      await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, user.id));
      await audit({
        actorId: user.id,
        actorLabel: user.username,
        action: "EMAIL_VERIFIED",
        targetType: "User",
        targetId: user.id,
        ip,
      });
    }

    return json({ ok: true, redirect: "/dashboard?verified=1" });
  });
}
