#!/usr/bin/env tsx
/**
 * Server-side owner recovery.
 *
 *   npm run owner:recover
 *
 * Generates a new temporary password for the existing OWNER, forces a password
 * change on next login, signs out every session, and writes an audit entry.
 * It never creates an account and never changes the owner's role.
 */
import "dotenv/config";
import { randomInt } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { hash } from "@node-rs/argon2";
import { client, db } from "../src/db/index";
import { auditLogs, authTokens, sessions, users } from "../src/db/schema";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function generatePassword(length = 24): string {
  const chars = [
    UPPER[randomInt(0, UPPER.length)]!,
    LOWER[randomInt(0, LOWER.length)]!,
    DIGITS[randomInt(0, DIGITS.length)]!,
    SYMBOLS[randomInt(0, SYMBOLS.length)]!,
  ];
  while (chars.length < length) chars.push(ALL[randomInt(0, ALL.length)]!);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

async function main() {
  const owners = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.role, "OWNER"))
    .orderBy(asc(users.createdAt));
  const owner = owners[0];

  if (!owner) {
    console.error("No owner account exists. Run `npm run topcloud` (or `npm run db:seed`) first.");
    process.exitCode = 1;
    return;
  }
  if (owners.length > 1) {
    console.warn(`Warning: ${owners.length} owner accounts exist. Recovering the oldest for ${owner.username}.`);
  }

  const password = generatePassword(24);
  const passwordHash = await hash(password, {
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  });

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, mustChangePassword: true })
      .where(eq(users.id, owner.id));
    await tx.delete(sessions).where(eq(sessions.userId, owner.id));
    await tx
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(authTokens.userId, owner.id), isNull(authTokens.usedAt)));
    await tx.insert(auditLogs).values({
      actorId: owner.id,
      actorLabel: owner.username,
      action: "OWNER_RECOVERY",
      targetType: "User",
      targetId: owner.id,
      metadata: JSON.stringify({ method: "server-cli" }),
    });
  });

  console.log("\nTop Cloud · owner recovery complete\n");
  console.log(`  Username:  ${owner.username}`);
  console.log(`  Temporary password:  ${password}`);
  console.log("\n  Store this somewhere safe and sign in immediately.");
  console.log("  The admin area will force a password change before it unlocks.");
  console.log("  All existing sessions have been signed out.\n");
}

main()
  .catch((error) => {
    console.error("Recovery failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    client.close();
  });
