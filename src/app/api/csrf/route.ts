import { env } from "@/lib/env";
import { csrfCookie, CSRF_COOKIE } from "@/lib/session";
import { getCookie, newCsrfToken } from "@/lib/request";
import { json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const existing = getCookie(req, CSRF_COOKIE);
  const token = existing && existing.length >= 16 && existing.length <= 128 ? existing : newCsrfToken();
  const response = json({ token, secure: env.cookieSecure });
  response.headers.append("Set-Cookie", csrfCookie(token));
  return response;
}
