import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { issueAuthToken } from "@/lib/tokens";
import { createSession, csrfCookie, sessionCookie } from "@/lib/session";
import { audit } from "@/lib/audit";
import { sendVerificationEmail } from "@/lib/email";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp, hashIp, newCsrfToken } from "@/lib/request";
import {
  ApiError,
  assertMutation,
  attachCookies,
  handle,
  json,
  parseBody,
  rateLimited,
} from "@/lib/api";
import { registerSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle("auth.register", async () => {
    assertMutation(req);
    const ip = getClientIp(req);
    const limit = await consumeRateLimit(`register:ip:${hashIp(ip)}`, 10, 60 * 60);
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

    const input = await parseBody(req, registerSchema);
    const strength = validatePasswordStrength(input.password);
    if (!strength.ok) {
      throw new ApiError(422, "WEAK_PASSWORD", strength.message, {
        fields: { password: strength.message },
      });
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.username, input.username), eq(users.email, input.email)))
      .limit(1);
    if (existing[0]) {
      throw new ApiError(409, "ACCOUNT_EXISTS", "That username or email is already in use.", {
        fields: { form: "That username or email is already in use." },
      });
    }

    const passwordHash = await hashPassword(input.password);
    const [user] = await db
      .insert(users)
      .values({
        username: input.username,
        email: input.email,
        passwordHash,
        role: "MEMBER",
        permissions: "[]",
      })
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });

    try {
      const { token } = await issueAuthToken(user!.id, "EMAIL_VERIFY");
      await sendVerificationEmail({ to: user!.email, username: user!.username, token });
    } catch (error) {
      console.error(
        "[top-cloud] verification email failed",
        error instanceof Error ? error.message : "unknown",
      );
    }

    const session = await createSession(user!.id, {
      ip,
      userAgent: req.headers.get("user-agent"),
    });
    const csrf = newCsrfToken();

    await audit({
      actorId: user!.id,
      actorLabel: user!.username,
      action: "USER_REGISTERED",
      targetType: "User",
      targetId: user!.id,
      ip,
    });

    const response = json(
      {
        user: {
          id: user!.id,
          username: user!.username,
          email: user!.email,
          role: user!.role,
          mustChangePassword: false,
        },
        redirect: "/dashboard",
      },
      { status: 201 },
    );

    return attachCookies(response, sessionCookie(session.token, session.expiresAt), csrfCookie(csrf));
  });
}
