import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "tc_session";
const CSRF_COOKIE = "tc_csrf";

const MEMBER_PROTECTED = ["/dashboard", "/apply", "/my-applications", "/profile"];
const ADMIN_PROTECTED = ["/admin"];

function isProtected(pathname: string): "admin" | "member" | null {
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) return null;
  if (ADMIN_PROTECTED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return "admin";
  }
  if (MEMBER_PROTECTED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return "member";
  }
  return null;
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const protectedArea = isProtected(pathname);
  if (protectedArea && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = protectedArea === "admin" ? "/admin/login" : "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("Cache-Control", "no-store");
    return redirect;
  }

  const response = NextResponse.next();
  const secure = request.headers.get("x-forwarded-proto") === "https" || request.nextUrl.protocol === "https:";
  if (!request.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, randomToken(), {
      httpOnly: false,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  if (protectedArea) response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|manifest.webmanifest|.*\\..*).*)"],
};
