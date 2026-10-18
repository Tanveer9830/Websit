import { and, eq, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { env } from "@/lib/env";
import { getCookie, hashIp, randomToken, serializeCookie, sha256 } from "@/lib/request";

export const SESSION_COOKIE = "tc_session";
export const CSRF_COOKIE = "tc_csrf";
const DAY_MS = 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string;
  emailVerifiedAt: Date | null;
  mustChangePassword: boolean;
  isDisabled: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
};

export type AuthContext = {
  user: SessionUser;
  sessionId: string;
  cookieHeader: string;
};

function sessionExpiry(): Date {
  return new Date(Date.now() + env.sessionTtlDays * DAY_MS);
}

export async function createSession(
  userId: string,
  meta: { ip?: string; userAgent?: string | null } = {},
): Promise<{ token: string; expiresAt: Date; sessionId: string }> {
  const token = randomToken(32);
  const expiresAt = sessionExpiry();
  const [session] = await db
    .insert(sessions)
    .values({
      tokenHash: sha256(token),
      userId,
      expiresAt,
      ipHash: meta.ip ? hashIp(meta.ip) : null,
      userAgent: (meta.userAgent ?? "").slice(0, 300) || null,
    })
    .returning({ id: sessions.id });
  return { token, expiresAt, sessionId: session!.id };
}

export function sessionCookie(token: string, expiresAt: Date): string {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  return serializeCookie(SESSION_COOKIE, token, {
    maxAge,
    httpOnly: true,
    sameSite: "Lax",
    secure: env.cookieSecure,
    path: "/",
  });
}

export function clearSessionCookie(): string {
  return serializeCookie(SESSION_COOKIE, "", {
    maxAge: 0,
    httpOnly: true,
    sameSite: "Lax",
    secure: env.cookieSecure,
    path: "/",
  });
}

export function csrfCookie(token: string): string {
  return serializeCookie(CSRF_COOKIE, token, {
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: false,
    sameSite: "Lax",
    secure: env.cookieSecure,
    path: "/",
  });
}

export async function getSessionFromRequest(req: Request): Promise<AuthContext | null> {
  const token = getCookie(req, SESSION_COOKIE);
  if (!token || token.length > 300) return null;

  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      sessionCreatedAt: sessions.createdAt,
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      permissions: users.permissions,
      emailVerifiedAt: users.emailVerifiedAt,
      mustChangePassword: users.mustChangePassword,
      isDisabled: users.isDisabled,
      userCreatedAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, sha256(token)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, row.sessionId)).catch(() => undefined);
    return null;
  }
  if (row.isDisabled) {
    await db.delete(sessions).where(eq(sessions.userId, row.id)).catch(() => undefined);
    return null;
  }

  if (Date.now() - row.sessionCreatedAt.getTime() > 60 * 60 * 1000) {
    void db
      .update(sessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(sessions.id, row.sessionId))
      .catch(() => undefined);
  }

  return {
    user: {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      permissions: row.permissions,
      emailVerifiedAt: row.emailVerifiedAt,
      mustChangePassword: row.mustChangePassword,
      isDisabled: row.isDisabled,
      createdAt: row.userCreatedAt,
      lastLoginAt: row.lastLoginAt,
    },
    sessionId: row.sessionId,
    cookieHeader: req.headers.get("cookie") ?? "",
  };
}

export async function destroySession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId)).catch(() => undefined);
}

export async function destroySessionByToken(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token))).catch(() => undefined);
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
  const where = exceptSessionId
    ? and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId))
    : eq(sessions.userId, userId);
  const result = await db.delete(sessions).where(where).returning({ id: sessions.id });
  return result.length;
}

export async function cleanupExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date())).catch(() => undefined);
}
