import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { authTokens, users } from "@/db/schema";
import { randomToken, sha256 } from "@/lib/request";

export type AuthTokenType = "EMAIL_VERIFY" | "PASSWORD_RESET";

const TOKEN_TTL: Record<AuthTokenType, number> = {
  EMAIL_VERIFY: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

/**
 * Creates a single-use token. Only its SHA-256 hash is stored; the plaintext is
 * returned once so it can be placed in an email link.
 */
export async function issueAuthToken(
  userId: string,
  type: AuthTokenType,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + TOKEN_TTL[type]);

  await db.transaction(async (tx) => {
    await tx
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(authTokens.userId, userId), eq(authTokens.type, type), isNull(authTokens.usedAt)));
    await tx.insert(authTokens).values({
      userId,
      type,
      tokenHash: sha256(token),
      expiresAt,
    });
  });

  return { token, expiresAt };
}

export async function consumeAuthToken(token: string, type: AuthTokenType) {
  if (!token || token.length > 300) return null;
  const rows = await db
    .select({ token: authTokens, user: users })
    .from(authTokens)
    .innerJoin(users, eq(authTokens.userId, users.id))
    .where(eq(authTokens.tokenHash, sha256(token)))
    .limit(1);

  const record = rows[0];
  if (!record) return null;
  if (record.token.type !== type) return null;
  if (record.token.usedAt) return null;
  if (record.token.expiresAt.getTime() <= Date.now()) return null;

  const consumed = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.id, record.token.id), isNull(authTokens.usedAt)))
    .returning({ id: authTokens.id });
  if (consumed.length !== 1) return null;
  return record.user;
}
