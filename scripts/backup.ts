#!/usr/bin/env tsx
/**
 * Creates a consistent, standalone libSQL/SQLite backup using `VACUUM INTO`.
 * Safe to run while the panel is live (WAL mode).
 *
 *   npm run db:backup
 */
import "dotenv/config";
import { chmodSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { client } from "../src/db/index";

async function main() {
  const dir = path.join(process.cwd(), "data", "backups");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = path.join(dir, `topcloud-${timestamp}.db`);

  await client.execute({ sql: "VACUUM INTO ?", args: [target] });
  chmodSync(target, 0o600);

  const size = statSync(target).size;
  console.log("\nTop Cloud backup complete");
  console.log(`  File: ${target}`);
  console.log(`  Size: ${(size / 1024).toFixed(1)} KB`);
  console.log("\nRestore:");
  console.log("  1. Stop the server.");
  console.log("  2. Replace data/topcloud.db with this file.");
  console.log("  3. Delete any topcloud.db-wal / topcloud.db-shm files.");
  console.log("  4. Start the server and run `npm run db:migrate`.\n");
}

main()
  .catch((error) => {
    console.error("Backup failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    client.close();
  });
