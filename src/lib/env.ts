function intFromEnv(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function boolFromEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

function normalizedUrl(value: string | undefined): string {
  const raw = (value || "http://localhost:3000").trim();
  try {
    const url = new URL(raw);
    return url.toString().replace(/\/+$/, "");
  } catch {
    return "http://localhost:3000";
  }
}

const isProduction = process.env.NODE_ENV === "production";

export const env = {
  appUrl: normalizedUrl(process.env.APP_URL),
  sessionTtlDays: intFromEnv(process.env.SESSION_TTL_DAYS, 7, 1, 30),
  // Secure cookies are the default in production. Set COOKIE_SECURE=false only
  // for a deliberate plain-HTTP deployment (not recommended).
  cookieSecure: isProduction ? boolFromEnv(process.env.COOKIE_SECURE, true) : boolFromEnv(process.env.COOKIE_SECURE, false),
  isProduction,
  smtp: {
    host: (process.env.SMTP_HOST || "").trim(),
    port: intFromEnv(process.env.SMTP_PORT, 587, 1, 65535),
    secure: boolFromEnv(process.env.SMTP_SECURE, false),
    user: (process.env.SMTP_USER || "").trim(),
    password: process.env.SMTP_PASSWORD || "",
    from: (process.env.EMAIL_FROM || "Top Cloud <no-reply@topcloud.local>").trim(),
  },
} as const;

export function emailConfigured(): boolean {
  return Boolean(env.smtp.host);
}
