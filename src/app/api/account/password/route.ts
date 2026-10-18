import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/password";
import { revokeAllSessions } from "@/lib/session";
import { audit } from "@/lib/audit";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { ApiError, assertMutation, handle, json, parseBody, rateLimited, requireUser } from "@/lib/api";
import { changePasswordSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle("account.password", async () => {
    assertMutation(req);
    const auth = await requireUser(req);
    const limit = await consumeRateLimit(`password:change:${auth.user.id}`, 5, 15 * 60);
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

    const input = await parseBody(req, changePasswordSchema);
    const rows = await db
      .select({
        passwordHash: users.passwordHash,
        role: users.role,
        mustChangePassword: users.mustChangePassword,
      })
      .from(users)
      .where(eq(users.id, auth.user.id))
      .limit(1);
    const fullUser = rows[0];
    if (!fullUser) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in again.");

    const valid = await verifyPassword(fullUser.passwordHash, input.currentPassword);
    if (!valid) {
      throw new ApiError(401, "INVALID_PASSWORD", "Your current password is incorrect.", {
        fields: { currentPassword: "Your current password is incorrect." },
      });
    }

    const isOwner = fullUser.role === "OWNER";
    const strength = validatePasswordStrength(input.newPassword, {
      min: isOwner ? 10 : 8,
      isOwner,
    });
    if (!strength.ok) {
      throw new ApiError(422, "WEAK_PASSWORD", strength.message, {
        fields: { newPassword: strength.message },
      });
    }
    if (input.newPassword === input.currentPassword) {
      throw new ApiError(422, "SAME_PASSWORD", "Choose a password that is different from the current one.", {
        fields: { newPassword: "Choose a different password." },
      });
    }

    const passwordHash = await hashPassword(input.newPassword);
    await db
      .update(users)
      .set({ passwordHash, mustChangePassword: false })
      .where(eq(users.id, auth.user.id));
    await revokeAllSessions(auth.user.id, auth.sessionId);
    await audit({
      actorId: auth.user.id,
      actorLabel: auth.user.username,
      action: "PASSWORD_CHANGED",
      targetType: "User",
      targetId: auth.user.id,
      ip: getClientIp(req),
    });

    return json({
      ok: true,
      message: "Password updated. Other sessions have been signed out.",
      wasTemporary: fullUser.mustChangePassword,
      redirect: fullUser.mustChangePassword && fullUser.role !== "MEMBER" ? "/admin" : null,
    });
  });
}
