import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { schema } from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not configured. Run `npm run topcloud` to create .env and initialise the database.",
  );
}

// Make sure a local database directory exists before libSQL opens the file.
if (databaseUrl.startsWith("file:")) {
  const raw = databaseUrl.slice("file:".length).split("?")[0];
  if (raw && raw !== ":memory:" && !raw.startsWith(":memory:")) {
    const filePath = raw.startsWith("//") ? raw.replace(/^\/\//, "") : raw;
    try {
      mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true, mode: 0o700 });
    } catch {
      /* the directory may be read-only; libSQL will surface a clear error */
    }
  }
}

type DbGlobal = {
  topCloudClient?: ReturnType<typeof createClient>;
  topCloudDb?: ReturnType<typeof drizzle<typeof schema>>;
};

const globalForDb = globalThis as unknown as DbGlobal;

const client = globalForDb.topCloudClient ?? createClient({ url: databaseUrl });
const db = globalForDb.topCloudDb ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.topCloudClient = client;
  globalForDb.topCloudDb = db;
}

// Best-effort connection pragmas. libSQL already enables WAL for local files,
// but foreign keys and a busy timeout make concurrent requests safer.
void client.execute("PRAGMA foreign_keys = ON;").catch(() => undefined);
void client.execute("PRAGMA busy_timeout = 5000;").catch(() => undefined);

export { db, client, schema };
export type Database = typeof db;
