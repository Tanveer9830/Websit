#!/usr/bin/env node
/**
 * Top Cloud migration runner.
 *
 * The target environment cannot download Prisma's schema engine binary, so the
 * project uses plain, reviewed SQL migrations applied by this small runner.
 * It is transactional, checksum-verified and safe to re-run.
 *
 *   npm run db:migrate
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Run `npm run topcloud` first.");
  process.exit(1);
}

if (databaseUrl.startsWith("file:")) {
  const raw = databaseUrl.slice("file:".length).split("?")[0];
  if (raw && !raw.startsWith(":memory:")) {
    mkdirSync(path.dirname(path.resolve(raw)), { recursive: true, mode: 0o700 });
  }
}

const client = createClient({ url: databaseUrl });
const migrationsDir = path.join(process.cwd(), "db", "migrations");

function splitStatements(sql) {
  // The migration files contain no semicolons inside string literals, so a
  // quote-aware splitter is enough and keeps the runner dependency-free.
  const statements = [];
  let current = "";
  let quote = null;
  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];
    if (quote) {
      current += char;
      if (char === quote && next === quote) {
        current += next;
        i += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }
    if (char === "-" && next === "-") {
      const newline = sql.indexOf("\n", i);
      i = newline === -1 ? sql.length : newline;
      current += "\n";
      continue;
    }
    if (char === ";") {
      if (current.trim()) statements.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

async function main() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_topcloud_migrations" (
      "name" TEXT PRIMARY KEY NOT NULL,
      "checksum" TEXT NOT NULL,
      "applied_at" INTEGER NOT NULL
    )
  `);

  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const appliedResult = await client.execute('SELECT "name", "checksum" FROM "_topcloud_migrations"');
  const applied = new Map(appliedResult.rows.map((row) => [String(row.name), String(row.checksum)]));

  let count = 0;
  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    if (applied.has(file)) {
      if (applied.get(file) !== checksum) {
        throw new Error(
          `Migration ${file} changed after it was applied. Never edit applied migrations; add a new one instead.`,
        );
      }
      continue;
    }

    const statements = splitStatements(sql);
    const transaction = await client.transaction("write");
    try {
      for (const statement of statements) {
        await transaction.execute(statement);
      }
      await transaction.execute({
        sql: 'INSERT INTO "_topcloud_migrations" ("name", "checksum", "applied_at") VALUES (?, ?, ?)',
        args: [file, checksum, Date.now()],
      });
      await transaction.commit();
      console.log(`  ✓ applied ${file} (${statements.length} statements)`);
      count += 1;
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Migration ${file} failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  if (count === 0) console.log("  ✓ database schema already up to date");
  else console.log(`  ✓ ${count} migration${count === 1 ? "" : "s"} applied`);

  await client.execute("PRAGMA foreign_keys = ON;");
}

main()
  .catch((error) => {
    console.error("Migration failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
