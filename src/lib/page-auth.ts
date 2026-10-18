import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { getSessionFromRequest, type AuthContext } from "@/lib/session";
import { hasPermission, isAdminLike, type Permission } from "@/lib/permissions";

async function readSession(): Promise<AuthContext | null> {
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((cookie) => `${cookie.name}=${encodeURIComponent(cookie.value)}`)
    .join("; ");
  const req = new Request(env.appUrl, { headers: { cookie: cookieHeader } });
  return getSessionFromRequest(req);
}

/** Deduplicated per-request session lookup for server components. */
export const getPageSession = cache(readSession);

export async function requireMemberPage(nextPath = "/dashboard"): Promise<AuthContext> {
  const auth = await getPageSession();
  if (!auth) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return auth;
}

export async function requireAdminPage(
  path = "/admin",
  options: { allowPasswordChange?: boolean } = {},
): Promise<AuthContext> {
  const auth = await getPageSession();
  if (!auth) redirect(`/admin/login?next=${encodeURIComponent(path)}`);
  if (!isAdminLike(auth.user)) redirect("/dashboard?denied=admin");
  if (auth.user.mustChangePassword && !options.allowPasswordChange) {
    redirect("/admin/change-password");
  }
  return auth;
}

export function can(user: { role: string; permissions: string } | null | undefined, permission: Permission): boolean {
  return hasPermission(user, permission);
}

export function adminDefaultLanding(role: string, permissions: string): string {
  if (role === "OWNER") return "/admin";
  if (hasPermission({ role, permissions }, "REVIEW_APPLICATIONS")) return "/admin";
  if (hasPermission({ role, permissions }, "MANAGE_QUESTIONS")) return "/admin/questions";
  if (hasPermission({ role, permissions }, "MANAGE_MEMBERS")) return "/admin/members";
  if (hasPermission({ role, permissions }, "MANAGE_SETTINGS")) return "/admin/settings";
  return "/admin";
}

export function safeNextPath(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw.startsWith("/api")) return fallback;
  return raw;
}
