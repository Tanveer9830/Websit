import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Top Cloud schema (SQLite / libSQL).
 *
 * SQLite is used deliberately: the target environment has no PostgreSQL server
 * and cannot download external database binaries. libSQL is distributed through
 * npm, so `npm run topcloud` installs and runs without extra services.
 * The relational model is portable to PostgreSQL if a hosted database is added.
 */

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date());

export const users = sqliteTable(
  "users",
  {
    id: id(),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("MEMBER"),
    permissions: text("permissions").notNull().default("[]"),
    emailVerifiedAt: integer("email_verified_at", { mode: "timestamp_ms" }),
    mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(false),
    isDisabled: integer("is_disabled", { mode: "boolean" }).notNull().default(false),
    lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("idx_users_role").on(table.role), index("idx_users_created").on(table.createdAt)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: id(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: createdAt(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
  },
  (table) => [index("idx_sessions_user").on(table.userId), index("idx_sessions_expiry").on(table.expiresAt)],
);

export const authTokens = sqliteTable(
  "auth_tokens",
  {
    id: id(),
    tokenHash: text("token_hash").notNull().unique(),
    type: text("type").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: createdAt(),
    usedAt: integer("used_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("idx_tokens_user_type").on(table.userId, table.type), index("idx_tokens_expiry").on(table.expiresAt)],
);

export const formVersions = sqliteTable(
  "form_versions",
  {
    id: id(),
    version: integer("version").notNull().unique(),
    status: text("status").notNull().default("DRAFT"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    publishedById: text("published_by_id").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [index("idx_form_versions_status").on(table.status)],
);

export const questions = sqliteTable(
  "questions",
  {
    id: id(),
    formVersionId: text("form_version_id")
      .notNull()
      .references(() => formVersions.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    placeholder: text("placeholder").notNull().default(""),
    required: integer("required", { mode: "boolean" }).notNull().default(true),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    options: text("options").notNull().default("[]"),
    order: integer("order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("idx_questions_version_order").on(table.formVersionId, table.order)],
);

export const applications = sqliteTable(
  "applications",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    formVersionId: text("form_version_id")
      .notNull()
      .references(() => formVersions.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("PENDING"),
    position: text("position"),
    discordUsername: text("discord_username"),
    discordId: text("discord_id"),
    submittedAt: integer("submitted_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: updatedAt(),
    applicantSeenAt: integer("applicant_seen_at", { mode: "timestamp_ms" }),
    lastStatusChangedAt: integer("last_status_changed_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_applications_user_submitted").on(table.userId, table.submittedAt),
    index("idx_applications_status_submitted").on(table.status, table.submittedAt),
    index("idx_applications_submitted").on(table.submittedAt),
    index("idx_applications_discord").on(table.discordId),
  ],
);

export const answers = sqliteTable(
  "answers",
  {
    id: id(),
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    // Intentionally not a foreign key: the snapshot must survive question deletion.
    questionId: text("question_id"),
    questionType: text("question_type").notNull(),
    questionTitle: text("question_title").notNull(),
    questionDescription: text("question_description").notNull().default(""),
    placeholder: text("placeholder").notNull().default(""),
    options: text("options").notNull().default("[]"),
    required: integer("required", { mode: "boolean" }).notNull().default(true),
    answer: text("answer").notNull().default(""),
    order: integer("order").notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [index("idx_answers_application_order").on(table.applicationId, table.order)],
);

export const statusHistory = sqliteTable(
  "status_history",
  {
    id: id(),
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    note: text("note"),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorLabel: text("actor_label"),
    createdAt: createdAt(),
  },
  (table) => [index("idx_status_history_application").on(table.applicationId, table.createdAt)],
);

export const reviewNotes = sqliteTable(
  "review_notes",
  {
    id: id(),
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    visibility: text("visibility").notNull().default("INTERNAL"),
    published: integer("published", { mode: "boolean" }).notNull().default(false),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (table) => [
    index("idx_review_notes_application").on(table.applicationId, table.visibility, table.published),
  ],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: id(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorLabel: text("actor_label"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: text("metadata"),
    ipHash: text("ip_hash"),
    createdAt: createdAt(),
  },
  (table) => [index("idx_audit_created").on(table.createdAt), index("idx_audit_action").on(table.action)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: updatedAt(),
});

export const rateLimits = sqliteTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull().default(0),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_rate_limits_expiry").on(table.expiresAt)],
);

export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type FormVersionRow = typeof formVersions.$inferSelect;
export type QuestionRow = typeof questions.$inferSelect;
export type ApplicationRow = typeof applications.$inferSelect;
export type AnswerRow = typeof answers.$inferSelect;
export type StatusHistoryRow = typeof statusHistory.$inferSelect;
export type ReviewNoteRow = typeof reviewNotes.$inferSelect;
export type AuditLogRow = typeof auditLogs.$inferSelect;

export const schema = {
  users,
  sessions,
  authTokens,
  formVersions,
  questions,
  applications,
  answers,
  statusHistory,
  reviewNotes,
  auditLogs,
  settings,
  rateLimits,
};
