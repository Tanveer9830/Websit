import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const dbPath = path.resolve(process.cwd(), "data/topcloud-test.db");
const databaseUrl = `file:${dbPath}`;

export default function setup() {
  for (const suffix of ["", "-wal", "-shm"]) {
    rmSync(`${dbPath}${suffix}`, { force: true });
  }
  mkdirSync(path.dirname(dbPath), { recursive: true, mode: 0o700 });

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: databaseUrl,
    APP_URL: "http://localhost:3000",
    COOKIE_SECURE: "false",
    SESSION_TTL_DAYS: "7",
    OWNER_USERNAME: "admin",
    OWNER_INITIAL_PASSWORD: "admin",
    OWNER_EMAIL: "owner@topcloud.local",
  };

  console.log("\n[test] migrating an isolated test database…");
  execFileSync(process.execPath, ["scripts/migrate.mjs"], {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });

  console.log("[test] seeding the owner and starter form…");
  execFileSync(path.resolve(process.cwd(), "node_modules/.bin/tsx"), ["scripts/seed.ts"], {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });
}
