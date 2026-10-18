import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getDummyHash, verifyPassword } from "@/lib/password";
import { createSession, csrfCookie, sessionCookie } from "@/lib/session";
import { audit } from "@/lib/audit";
import { checkRateLimit, clearRateLimit, recordRateLimitHit } from "@/lib/rate-limit";
import { getClientIp, hashIp, newCsrfToken, sha256 } from "@/lib/request";
import {
  ApiError,
  assertMutation,
  attachCookies,
  handle,
  json,
  parseBody,
  rateLimited,
} from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { safeNextPath } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

const IDENTIFIER_LIMIT = 8;
const IP_LIMIT = 30;
const WINDOW_SECONDS = 15 * 60;

export async function POST(req: Request) {
  return handle("auth.login", async () => {
    assertMutation(req);
    const ip = getClientIp(req);
    const input = await parseBody(req, loginSchema);
    const identifier = input.identifier.trim().toLowerCase();
    const identifierKey = `login:id:${sha256(identifier).slice(0, 20)}`;
    const ipKey = `login:ip:${hashIp(ip)}`;

    const [idState, ipState] = await Promise.all([
      checkRateLimit(identifierKey, IDENTIFIER_LIMIT, WINDOW_SECONDS),
      checkRateLimit(ipKey, IP_LIMIT, WINDOW_SECONDS),
    ]);
    if (!idState.allowed || !ipState.allowed) {
      await audit({
        action: "LOGIN_BLOCKED",
        actorLabel: identifier.slice(0, 40),
        ip,
        metadata: { scope: input.admin ? "admin" : "member" },
      });
      return rateLimited(Math.max(idState.retryAfterSeconds, ipState.retryAfterSeconds));
    }

    const rows = await db
      .select()
      .from(users)
      .where(or(eq(users.username, identifier), eq(users.email, identifier)))
      .limit(1);
    const user = rows[0];

    if (!user) {
      await verifyPassword(await getDummyHash(), input.password);
      await Promise.all([
        recordRateLimitHit(identifierKey, WINDOW_SECONDS),
        recordRateLimitHit(ipKey, WINDOW_SECONDS),
      ]);
      await audit({
        action: "LOGIN_FAILED",
        actorLabel: identifier.slice(0, 40),
        ip,
        metadata: { scope: input.admin ? "admin" : "member", reason: "unknown_account" },
      });
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid username or password.");
    }

    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid || user.isDisabled) {
      await Promise.all([
        recordRateLimitHit(identifierKey, WINDOW_SECONDS),
        recordRateLimitHit(ipKey, WINDOW_SECONDS),
      ]);
      await audit({
        actorId: user.id,
        actorLabel: user.username,
        action: "LOGIN_FAILED",
        ip,
        metadata: {
          scope: input.admin ? "admin" : "member",
          reason: valid ? "disabled" : "bad_password",
        },
      });
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid username or password.");
    }

    const isPanelAccount = user.role === "OWNER" || user.role === "ADMIN";
    if (input.admin && !isPanelAccount) {
      await recordRateLimitHit(ipKey, WINDOW_SECONDS);
      await audit({
        actorId: user.id,
        actorLabel: user.username,
        action: "LOGIN_FAILED",
        ip,
        metadata: { scope: "admin", reason: "not_an_admin" },
      });
      throw new ApiError(403, "FORBIDDEN", "This account does not have access to the administration panel.");
    }

    await clearRateLimit(identifierKey);
    const session = await createSession(user.id, {
      ip,
      userAgent: req.headers.get("user-agent"),
    });
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    const requestedNext = safeNextPath(input.next, isPanelAccount ? "/admin" : "/dashboard");
    const memberNext = requestedNext.startsWith("/admin") ? "/dashboard" : requestedNext;
    const adminNext = requestedNext.startsWith("/admin") ? requestedNext : "/admin";
    const redirect = user.mustChangePassword
      ? "/admin/change-password"
      : isPanelAccount
        ? adminNext
        : memberNext;

    await audit({
      actorId: user.id,
      actorLabel: user.username,
      action: "LOGIN_SUCCESS",
      ip,
      metadata: { scope: input.admin ? "admin" : "member" },
    });

    const csrf = newCsrfToken();
    const response = json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      redirect,
    });

    return attachCookies(response, sessionCookie(session.token, session.expiresAt), csrfCookie(csrf));
  });
}
