import path from "node:path";
import { defineConfig } from "vitest/config";

const testDatabase = `file:${path.resolve(process.cwd(), "data/topcloud-test.db")}`;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    globalSetup: ["./tests/global-setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: testDatabase,
      APP_URL: "http://localhost:3000",
      COOKIE_SECURE: "false",
      SESSION_TTL_DAYS: "7",
      OWNER_USERNAME: "admin",
      OWNER_INITIAL_PASSWORD: "admin",
      OWNER_EMAIL: "owner@topcloud.local",
      DEV_EMAIL_TOKENS: "false",
    },
  },
});
