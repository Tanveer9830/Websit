import { eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

const CLEANUP_EVERY = 50;
let callsSinceCleanup = 0;

async function cleanupExpired(): Promise<void> {
  callsSinceCleanup += 1;
  if (callsSinceCleanup < CLEANUP_EVERY) return;
  callsSinceCleanup = 0;
  try {
    await db.delete(rateLimits).where(lt(rateLimits.expiresAt, new Date()));
  } catch {
    /* non-critical */
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  await cleanupExpired();
  const rows = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);
  const record = rows[0];
  const active = record && record.expiresAt.getTime() > now;
  const count = active ? record.count : 0;
  if (count < limit) {
    return { allowed: true, remaining: Math.max(0, limit - count), retryAfterSeconds: 0 };
  }
  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil(((record?.expiresAt.getTime() ?? now) - now) / 1000),
    ),
  };
}

export async function recordRateLimitHit(key: string, windowSeconds: number): Promise<void> {
  const now = Date.now();
  const expiresAt = new Date(now + windowSeconds * 1000);
  try {
    const rows = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);
    const current = rows[0];
    if (!current || current.expiresAt.getTime() <= now) {
      await db
        .insert(rateLimits)
        .values({ key, count: 1, expiresAt })
        .onConflictDoUpdate({ target: rateLimits.key, set: { count: 1, expiresAt } });
    } else {
      await db
        .update(rateLimits)
        .set({ count: sql`${rateLimits.count} + 1` })
        .where(eq(rateLimits.key, key));
    }
  } catch {
    /* Rate limiting is best-effort; never break authentication because of it. */
  }
}

/** Counts an action toward a quota and returns whether it is allowed. */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const state = await checkRateLimit(key, limit, windowSeconds);
  if (!state.allowed) return state;
  await recordRateLimitHit(key, windowSeconds);
  return { allowed: true, remaining: Math.max(0, state.remaining - 1), retryAfterSeconds: 0 };
}

export async function clearRateLimit(key: string): Promise<void> {
  try {
    await db.delete(rateLimits).where(eq(rateLimits.key, key));
  } catch {
    /* not found */
  }
}
