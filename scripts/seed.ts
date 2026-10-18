#!/usr/bin/env tsx
/**
 * Top Cloud — idempotent first-run seed.
 *
 * Safety guarantees:
 *  - An OWNER is created only when no owner exists.
 *  - An existing owner's username, email, password hash and flags are never touched.
 *  - Existing settings are never overwritten.
 *  - Existing form versions and applications are never modified.
 */
import "dotenv/config";
import { asc, desc, eq, or, sql } from "drizzle-orm";
import { hash } from "@node-rs/argon2";
import { client, db } from "../src/db/index";
import { auditLogs, formVersions, questions, users } from "../src/db/schema";
import { ensureDefaultSettings } from "../src/lib/settings";

const ARGON_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 };

const DEFAULT_QUESTIONS = [
  {
    type: "SHORT_TEXT",
    title: "What should we call you?",
    description: "The name you'd like the team to use.",
    placeholder: "e.g. Nova",
    required: true,
    options: [],
  },
  {
    type: "EMAIL",
    title: "Contact email",
    description: "Where we can reach you about this application.",
    placeholder: "you@example.com",
    required: true,
    options: [],
  },
  {
    type: "SELECT",
    title: "Which team fits you best?",
    description: "Choose the area you'd most like to join.",
    placeholder: "",
    required: true,
    options: ["Community Support", "Moderation", "Engineering", "Design & Content"],
  },
  {
    type: "RADIO",
    title: "How long have you been part of online communities?",
    description: "A rough sense is perfect — there is no wrong answer.",
    placeholder: "",
    required: true,
    options: ["Under 1 year", "1–3 years", "3–5 years", "5+ years"],
  },
  {
    type: "CHECKBOX",
    title: "Which tools are you comfortable with?",
    description: "Select all that apply.",
    placeholder: "",
    required: false,
    options: ["Discord", "Ticketing systems", "Figma", "Next.js / React", "Linux", "Community analytics"],
  },
  {
    type: "YES_NO",
    title: "Can you commit at least 8 hours per week?",
    description: "Reliability matters more than intensity.",
    placeholder: "",
    required: true,
    options: [],
  },
  {
    type: "NUMBER",
    title: "How many hours per week can you contribute?",
    description: "A realistic estimate helps us plan the team.",
    placeholder: "8",
    required: true,
    options: [],
  },
  {
    type: "LONG_TEXT",
    title: "Tell us about yourself",
    description: "Experience, strengths, and why Top Cloud. A few paragraphs is perfect.",
    placeholder: "Start anywhere — we're listening.",
    required: true,
    options: [],
  },
];

function questionValues(formVersionId: string) {
  return DEFAULT_QUESTIONS.map((question, index) => ({
    formVersionId,
    type: question.type,
    title: question.title,
    description: question.description,
    placeholder: question.placeholder,
    required: question.required,
    options: JSON.stringify(question.options),
    order: index,
  }));
}

async function ensureForm(ownerId: string) {
  const versions = await db
    .select({ id: formVersions.id, version: formVersions.version, status: formVersions.status })
    .from(formVersions)
    .orderBy(asc(formVersions.version));

  if (versions.length > 0) {
    const published = versions.filter((version) => version.status === "PUBLISHED").pop();
    const draft = versions.filter((version) => version.status === "DRAFT").pop();
    if (published && !draft) {
      const sourceQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.formVersionId, published.id))
        .orderBy(asc(questions.order));
      const nextVersion = versions[versions.length - 1]!.version + 1;
      const [created] = await db
        .insert(formVersions)
        .values({ version: nextVersion, status: "DRAFT" })
        .returning();
      if (sourceQuestions.length > 0) {
        await db.insert(questions).values(
          sourceQuestions.map((question) => ({
            formVersionId: created!.id,
            type: question.type,
            title: question.title,
            description: question.description,
            placeholder: question.placeholder,
            required: question.required,
            enabled: question.enabled,
            options: question.options,
            order: question.order,
          })),
        );
      }
      console.log("  ✓ created a draft from the published form");
    } else {
      console.log("  ✓ form versions preserved");
    }
    if (!published) console.log("  ! no published form exists yet — publish one from /admin/questions");
    return;
  }

  await db.transaction(async (tx) => {
    const [published] = await tx
      .insert(formVersions)
      .values({ version: 1, status: "PUBLISHED", publishedAt: new Date(), publishedById: ownerId })
      .returning();
    await tx.insert(questions).values(questionValues(published!.id));
    const [draft] = await tx.insert(formVersions).values({ version: 2, status: "DRAFT" }).returning();
    await tx.insert(questions).values(questionValues(draft!.id));
  });
  console.log("  ✓ published starter form v1 + editable draft v2");
}

async function main() {
  console.log("\nTop Cloud · database initialisation\n");

  const owners = await db
    .select({ id: users.id, username: users.username, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.role, "OWNER"))
    .orderBy(asc(users.createdAt));

  let owner = owners[0] ?? null;
  let createdOwner = false;

  if (!owner) {
    const username = (process.env.OWNER_USERNAME || "admin").trim().toLowerCase();
    const email = (process.env.OWNER_EMAIL || "owner@topcloud.local").trim().toLowerCase();
    const password = process.env.OWNER_INITIAL_PASSWORD || "admin";

    const conflict = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email)))
      .limit(1);
    if (conflict[0]) {
      throw new Error(
        `Cannot create the owner: username "${username}" or email "${email}" is already used by another account. ` +
          "No account was promoted automatically. Set OWNER_USERNAME / OWNER_EMAIL and retry, or resolve the conflict manually.",
      );
    }

    const passwordHash = await hash(password, ARGON_OPTIONS);
    const [created] = await db
      .insert(users)
      .values({
        username,
        email,
        passwordHash,
        role: "OWNER",
        permissions: "[]",
        emailVerifiedAt: new Date(),
        mustChangePassword: true,
      })
      .returning({ id: users.id, username: users.username, createdAt: users.createdAt });
    owner = created!;
    createdOwner = true;

    await db.insert(auditLogs).values({
      actorId: owner.id,
      actorLabel: owner.username,
      action: "OWNER_BOOTSTRAP",
      targetType: "User",
      targetId: owner.id,
      metadata: JSON.stringify({ mode: "first-install" }),
    });
    console.log(`  ✓ owner account created (${owner.username}) with Argon2id`);
  } else {
    console.log(`  ✓ existing owner preserved (${owner.username}) — credentials untouched`);
  }

  if (owners.length > 1) {
    console.warn(
      `  ! ${owners.length} owner accounts exist. Review /admin/members — the app never creates a second owner.`,
    );
  }

  await ensureDefaultSettings();
  console.log("  ✓ default panel settings ensured (existing values preserved)");
  await ensureForm(owner.id);

  const ownerCountRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, "OWNER"));
  const ownerCount = Number(ownerCountRows[0]?.count ?? 0);
  const ownerRecord = await db
    .select({ passwordHash: users.passwordHash, role: users.role })
    .from(users)
    .where(eq(users.id, owner.id))
    .limit(1);

  if (ownerCount !== 1) {
    throw new Error(`Expected exactly one owner, found ${ownerCount}. Refusing to continue silently.`);
  }
  if (!ownerRecord[0]?.passwordHash.startsWith("$argon2")) {
    throw new Error("Owner password is not stored with Argon2id. Refusing to continue.");
  }
  if (ownerRecord[0]?.role !== "OWNER") {
    throw new Error("Owner role verification failed.");
  }
  console.log("  ✓ zero-trust checks passed (one owner, Argon2id hash, roles valid)\n");

  if (createdOwner) {
    console.log("  First login:  username admin  ·  password admin");
    console.log("  You MUST change this temporary password immediately after signing in.\n");
  } else {
    console.log(
      "  Existing owner credentials were NOT reset. Use your current password or `npm run owner:recover`.\n",
    );
  }
  console.log(`  Owner user ID: ${owner.id}\n`);
}

main()
  .catch((error) => {
    console.error("\nInitialisation failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    client.close();
  });
