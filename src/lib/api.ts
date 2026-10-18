import { ZodError, type ZodSchema } from "zod";
import { getSessionFromRequest, type AuthContext } from "@/lib/session";
import {
  constantTimeEqual,
  getClientIp,
  getCookie,
  isOriginAllowed,
  readJsonBody,
} from "@/lib/request";
import { CSRF_COOKIE } from "@/lib/session";
import { hasPermission, type Permission } from "@/lib/permissions";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function apiError(status: number, code: string, message: string, details?: unknown): Response {
  return json({ error: { code, message, details: details ?? null } }, { status });
}

function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

export async function handle(label: string, fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.status, error.code, error.message, error.details);
    }
    if (error instanceof ZodError) {
      return apiError(422, "VALIDATION_ERROR", "Please check the highlighted fields.", {
        fields: zodFields(error),
      });
    }
    if (error instanceof Error && /UNIQUE constraint failed/i.test(error.message)) {
      return apiError(409, "CONFLICT", "That value is already in use.");
    }
    if (error instanceof Error && /SQLITE_BUSY|database is locked/i.test(error.message)) {
      return apiError(503, "DATABASE_BUSY", "The database is busy. Please retry in a moment.");
    }
    if (error instanceof Error && /Request body too large|Malformed JSON|Content-Type/.test(error.message)) {
      return apiError(400, "BAD_REQUEST", error.message);
    }
    console.error(`[top-cloud][${label}]`, error instanceof Error ? error.message : "Unexpected error");
    return apiError(500, "INTERNAL_ERROR", "Something went wrong on our side. Please try again.");
  }
}

/** CSRF double-submit + origin validation for every state-changing request. */
export function assertMutation(req: Request): void {
  if (!isOriginAllowed(req)) {
    throw new ApiError(403, "ORIGIN_REJECTED", "Request origin is not allowed.");
  }
  const cookieToken = getCookie(req, CSRF_COOKIE);
  const headerToken = req.headers.get("x-csrf-token");
  if (!cookieToken || !headerToken || !constantTimeEqual(cookieToken, headerToken)) {
    throw new ApiError(
      403,
      "CSRF_FAILED",
      "Security token expired or missing. Refresh the page and try again.",
    );
  }
}

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  const raw = await readJsonBody(req);
  return schema.parse(raw);
}

export async function requireUser(req: Request): Promise<AuthContext> {
  const auth = await getSessionFromRequest(req);
  if (!auth) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  return auth;
}

export async function requireAdmin(req: Request, permission?: Permission): Promise<AuthContext> {
  const auth = await requireUser(req);
  if (auth.user.role !== "OWNER" && auth.user.role !== "ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "Administrator access is required.");
  }
  if (auth.user.mustChangePassword) {
    throw new ApiError(
      403,
      "PASSWORD_CHANGE_REQUIRED",
      "Change the temporary password before using the administration panel.",
    );
  }
  if (permission && !hasPermission(auth.user, permission)) {
    throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action.");
  }
  return auth;
}

export async function requireOwner(req: Request): Promise<AuthContext> {
  const auth = await requireUser(req);
  if (auth.user.role !== "OWNER") {
    throw new ApiError(403, "FORBIDDEN", "Only the owner can perform this action.");
  }
  if (auth.user.isDisabled) throw new ApiError(403, "FORBIDDEN", "Account disabled.");
  if (auth.user.mustChangePassword) {
    throw new ApiError(
      403,
      "PASSWORD_CHANGE_REQUIRED",
      "Change the temporary password before performing owner actions.",
    );
  }
  return auth;
}

export function clientIp(req: Request): string {
  return getClientIp(req);
}

export function rateLimited(retryAfterSeconds: number): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: "RATE_LIMITED",
        message: "Too many attempts. Please wait and try again.",
        details: { retryAfterSeconds },
      },
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Retry-After": String(Math.max(1, retryAfterSeconds)),
        "Cache-Control": "no-store",
      },
    },
  );
}

export function attachCookies(res: Response, ...cookies: string[]): Response {
  for (const cookie of cookies) res.headers.append("Set-Cookie", cookie);
  return res;
}
