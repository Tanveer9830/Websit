import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

export function getClientIp(req: Request): string {
  // Use the *last* hop in X-Forwarded-For. Proxies append the address they saw,
  // so anything earlier in the list may be client-controlled. This only matters
  // for IP-based throttling and audit hashes; account-level throttling never
  // depends on the header.
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((hop) => hop.trim()).filter(Boolean);
    const nearest = hops[hops.length - 1];
    if (nearest) return nearest.slice(0, 80);
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim().slice(0, 80);
  return "local";
}

/** Deterministic, non-reversible pseudonym for an IP address (for audit/rate limits). */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`top-cloud:ip:${ip}`).digest("hex").slice(0, 32);
}

export function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(trimmed.slice(eq + 1));
    } catch {
      return trimmed.slice(eq + 1);
    }
  }
  return null;
}

type CookieOptions = {
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  path?: string;
};

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path ?? "/"}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  if (options.httpOnly !== false) parts.push("HttpOnly");
  if (options.secure ?? env.cookieSecure) parts.push("Secure");
  parts.push(`SameSite=${options.sameSite ?? "Lax"}`);
  return parts.join("; ");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function constantTimeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

const MAX_JSON_BYTES = 100_000;

export async function readJsonBody(req: Request): Promise<unknown> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Content-Type must be application/json");
  }
  const declared = Number.parseInt(req.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) {
    throw new Error("Request body too large");
  }
  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > MAX_JSON_BYTES) {
    throw new Error("Request body too large");
  }
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Malformed JSON body");
  }
}

/**
 * Host-based origin validation (defence in depth alongside the double-submit
 * CSRF token). We accept the request when the Origin header is absent (CLI and
 * same-origin navigations may omit it) but reject a present, mismatched Origin.
 */
export function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  const allowed = new Set<string>();
  try {
    allowed.add(new URL(env.appUrl).host.toLowerCase());
  } catch {
    /* ignore */
  }
  try {
    allowed.add(new URL(req.url).host.toLowerCase());
  } catch {
    /* ignore */
  }
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) allowed.add(host.split(",")[0]!.trim().toLowerCase());
  return allowed.has(originHost);
}

export function newCsrfToken(): string {
  return randomToken(24);
}
