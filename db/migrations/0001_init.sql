-- Top Cloud · initial schema
-- SQLite / libSQL. Timestamps are Unix milliseconds (Drizzle timestamp_ms).

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "username" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'MEMBER',
  "permissions" TEXT NOT NULL DEFAULT '[]',
  "email_verified_at" INTEGER,
  "must_change_password" INTEGER NOT NULL DEFAULT 0,
  "is_disabled" INTEGER NOT NULL DEFAULT 0,
  "last_login_at" INTEGER,
  "created_at" INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  "updated_at" INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role");
CREATE INDEX IF NOT EXISTS "idx_users_created" ON "users" ("created_at");

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "token_hash" TEXT NOT NULL UNIQUE,
  "user_id" TEXT NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "expires_at" INTEGER NOT NULL,
  "created_at" INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  "last_seen_at" INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  "user_agent" TEXT,
  "ip_hash" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_sessions_user" ON "sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_sessions_expiry" ON "sessions" ("expires_at");

CREATE TABLE IF NOT EXISTS "auth_tokens" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "token_hash" TEXT NOT NULL UNIQUE,
  "type" TEXT NOT NULL,
  "user_id" TEXT NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "expires_at" INTEGER NOT NULL,
  "created_at" INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  "used_at" INTEGER
);

CREATE INDEX IF NOT EXISTS "idx_tokens_user_type" ON "auth_tokens" ("user_id", "type");
CREATE INDEX IF NOT EXISTS "idx_tokens_expiry" ON "auth_tokens" ("expires_at");

CREATE TABLE IF NOT EXISTS "form_versions" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "version" INTEGER NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "created_at" INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  "updated_at" INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  "published_at" INTEGER,
  "published_by_id" TEXT REFERENCES "users" ("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_form_versions_status" ON "form_versions" ("status");

CREATE TABLE IF NOT EXISTS "questions" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "form_version_id" TEXT NOT NULL REFERENCES "form_versions" ("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "placeholder" TEXT NOT NULL DEFAULT '',
  "required" INTEGER NOT NULL DEFAULT 1,
  "enabled" INTEGER NOT NULL DEFAULT 1,
  "options" TEXT NOT NULL DEFAULT '[]',
  "order" INTEGER NOT NULL DEFAULT 0,
  "created_at" INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  "updated_at" INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS "idx_questions_version_order" ON "questions" ("form_version_id", "order");

CREATE TABLE IF NOT EXISTS "applications" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "reference" TEXT NOT NULL UNIQUE,
  "user_id" TEXT NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
  "form_version_id" TEXT NOT NULL REFERENCES "form_versions" ("id") ON DELETE RESTRICT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "position" TEXT,
  "discord_username" TEXT,
  "discord_id" TEXT,
  "submitted_at" INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  "updated_at" INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  "applicant_seen_at" INTEGER,
  "last_status_changed_at" INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS "idx_applications_user_submitted" ON "applications" ("user_id", "submitted_at");
CREATE INDEX IF NOT EXISTS "idx_applications_status_submitted" ON "applications" ("status", "submitted_at");
CREATE INDEX IF NOT EXISTS "idx_applications_submitted" ON "applications" ("submitted_at");
CREATE INDEX IF NOT EXISTS "idx_applications_discord" ON "applications" ("discord_id");

CREATE TABLE IF NOT EXISTS "answers" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "application_id" TEXT NOT NULL REFERENCES "applications" ("id") ON DELETE CASCADE,
  "question_id" TEXT,
  "question_type" TEXT NOT NULL,
  "question_title" TEXT NOT NULL,
  "question_description" TEXT NOT NULL DEFAULT '',
  "placeholder" TEXT NOT NULL DEFAULT '',
  "options" TEXT NOT NULL DEFAULT '[]',
  "required" INTEGER NOT NULL DEFAULT 1,
  "answer" TEXT NOT NULL DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0,
  "created_at" INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS "idx_answers_application_order" ON "answers" ("application_id", "order");

CREATE TABLE IF NOT EXISTS "status_history" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "application_id" TEXT NOT NULL REFERENCES "applications" ("id") ON DELETE CASCADE,
  "from_status" TEXT,
  "to_status" TEXT NOT NULL,
  "note" TEXT,
  "actor_id" TEXT REFERENCES "users" ("id") ON DELETE SET NULL,
  "actor_label" TEXT,
  "created_at" INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS "idx_status_history_application" ON "status_history" ("application_id", "created_at");

CREATE TABLE IF NOT EXISTS "review_notes" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "application_id" TEXT NOT NULL REFERENCES "applications" ("id") ON DELETE CASCADE,
  "author_id" TEXT REFERENCES "users" ("id") ON DELETE SET NULL,
  "body" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'INTERNAL',
  "published" INTEGER NOT NULL DEFAULT 0,
  "published_at" INTEGER,
  "created_at" INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS "idx_review_notes_application" ON "review_notes" ("application_id", "visibility", "published");

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "actor_id" TEXT REFERENCES "users" ("id") ON DELETE SET NULL,
  "actor_label" TEXT,
  "action" TEXT NOT NULL,
  "target_type" TEXT,
  "target_id" TEXT,
  "metadata" TEXT,
  "ip_hash" TEXT,
  "created_at" INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS "idx_audit_created" ON "audit_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_audit_action" ON "audit_logs" ("action");

CREATE TABLE IF NOT EXISTS "settings" (
  "key" TEXT PRIMARY KEY NOT NULL,
  "value" TEXT NOT NULL,
  "updated_at" INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS "rate_limits" (
  "key" TEXT PRIMARY KEY NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "expires_at" INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_rate_limits_expiry" ON "rate_limits" ("expires_at");
