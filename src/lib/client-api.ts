"use client";

export class ApiClientError extends Error {
  status: number;
  code: string;
  fields: Record<string, string>;
  details: unknown;

  constructor(
    message: string,
    options: { status?: number; code?: string; fields?: Record<string, string>; details?: unknown } = {},
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status ?? 500;
    this.code = options.code ?? "UNKNOWN";
    this.fields = options.fields ?? {};
    this.details = options.details ?? null;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((entry) => entry.startsWith(`${name}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(name.length + 1));
  } catch {
    return match.slice(name.length + 1);
  }
}

let csrfCache: string | null = null;

export async function ensureCsrf(force = false): Promise<string> {
  if (!force) {
    const cookie = readCookie("tc_csrf");
    if (cookie) {
      csrfCache = cookie;
      return cookie;
    }
    if (csrfCache) return csrfCache;
  }
  const response = await fetch("/api/csrf", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new ApiClientError("Could not establish a secure session. Refresh the page.", { status: response.status });
  const data = (await response.json()) as { token?: string };
  if (!data.token) throw new ApiClientError("Could not establish a secure session. Refresh the page.");
  csrfCache = data.token;
  return data.token;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
    headers["x-csrf-token"] = await ensureCsrf();
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch {
    throw new ApiClientError("Network error. Check your connection and try again.", { code: "NETWORK" });
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const payload = (data ?? {}) as {
      error?: { message?: string; code?: string; details?: unknown };
    };
    const details = payload.error?.details;
    const fields =
      details && typeof details === "object" && "fields" in details
        ? ((details as { fields?: Record<string, string> }).fields ?? {})
        : {};
    if (response.status === 403 && payload.error?.code === "CSRF_FAILED") {
      csrfCache = null;
    }
    throw new ApiClientError(payload.error?.message ?? "Something went wrong. Please try again.", {
      status: response.status,
      code: payload.error?.code,
      fields,
      details,
    });
  }

  return data as T;
}
