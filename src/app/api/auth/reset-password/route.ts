import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { consumeAuthToken } from "@/lib/tokens";
import { revokeAllSessions } from "@/lib/session";
import { audit } from "@/lib/audit";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp, hashIp } from "@/lib/request";
import { ApiError, assertMutation, handle, json, parseBody, rateLimited } from "@/lib/api";
import { resetPasswordSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle("auth.reset-password", async () => {
    assertMutation(req);
    const ip = getClientIp(req);
    const limit = await consumeRateLimit(`reset:submit:${hashIp(ip)}`, 20, 60 * 60);
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

    const input = await parseBody(req, resetPasswordSchema);
    const user = await consumeAuthToken(input.token, "PASSWORD_RESET");
    if (!user) {
      throw new ApiError(400, "INVALID_TOKEN", "This reset link is invalid or has expired.");
    }

    const strength = validatePasswordStrength(input.password, {
      min: user.role === "OWNER" ? 10 : 8,
      isOwner: user.role === "OWNER",
    });
    if (!strength.ok) {
      throw new ApiError(422, "WEAK_PASSWORD", strength.message, {
        fields: { password: strength.message },
      });
    }

    const passwordHash = await hashPassword(input.password);
    await db
      .update(users)
      .set({ passwordHash, mustChangePassword: false })
      .where(eq(users.id, user.id));
    await revokeAllSessions(user.id);
    await audit({
      actorId: user.id,
      actorLabel: user.username,
      action: "PASSWORD_RESET",
      targetType: "User",
      targetId: user.id,
      ip,
    });

    return json({ ok: true, redirect: "/login?reset=1" });
  });
}
