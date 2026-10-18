import { execFileSync } from "node:child_process";
import path from "node:path";
import { GET as csrfGET } from "@/app/api/csrf/route";

export const BASE_URL = "http://localhost:3000";
export const TEST_DB_URL = `file:${path.resolve(process.cwd(), "data/topcloud-test.db")}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteHandler = (req: Request, context?: any) => Response | Promise<Response>;

type CallOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string>;
  headers?: Record<string, string>;
};

export type ApiResult = {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  headers: Headers;
};

/**
 * A tiny in-process HTTP client for exercising real Next.js route handlers.
 * It mimics a browser: cookies are stored, the double-submit CSRF token is read
 * from the cookie automatically, and a per-client IP keeps rate-limit buckets
 * isolated between test actors.
 */
export class TestClient {
  ip: string;
  private cookies = new Map<string, string>();

  constructor(ip = "127.0.0.1") {
    this.ip = ip;
  }

  cookieHeader(): string {
    return [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
      .join("; ");
  }

  csrfToken(): string | undefined {
    return this.cookies.get("tc_csrf");
  }

  private capture(response: Response) {
    const raw = typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
    for (const cookie of raw) {
      const [pair, ...attributes] = cookie.split(";");
      if (!pair) continue;
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1);
      const expired = attributes.some((attribute) => /^\s*max-age=0\s*$/i.test(attribute));
      if (expired || value === "") this.cookies.delete(name);
      else {
        try {
          this.cookies.set(name, decodeURIComponent(value));
        } catch {
          this.cookies.set(name, value);
        }
      }
    }
  }

  async ensureCsrf(force = false): Promise<string> {
    const current = this.cookies.get("tc_csrf");
    if (!force && current) return current;
    const response = await csrfGET(
      new Request(`${BASE_URL}/api/csrf`, {
        headers: { "x-forwarded-for": this.ip },
      }),
    );
    this.capture(response);
    const data = (await response.json()) as { token: string };
    return data.token;
  }

  async call(handler: RouteHandler, route: string, options: CallOptions = {}): Promise<ApiResult> {
    const method = options.method ?? "GET";
    const headers: Record<string, string> = {
      origin: BASE_URL,
      "x-forwarded-for": this.ip,
      ...options.headers,
    };
    if (method !== "GET") {
      headers["content-type"] = "application/json";
      if (!headers["x-csrf-token"]) headers["x-csrf-token"] = await this.ensureCsrf();
    }
    const cookie = this.cookieHeader();
    if (cookie) headers.cookie = cookie;

    const request = new Request(`${BASE_URL}${route}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const response = options.params
      ? await handler(request, { params: Promise.resolve(options.params) })
      : await handler(request);
    this.capture(response);
    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: response.status, data, headers: response.headers };
  }

  get(handler: RouteHandler, route: string, options: Omit<CallOptions, "method" | "body"> = {}) {
    return this.call(handler, route, { ...options, method: "GET" });
  }

  post(handler: RouteHandler, route: string, body?: unknown, options: Omit<CallOptions, "method" | "body"> = {}) {
    return this.call(handler, route, { ...options, method: "POST", body });
  }

  patch(handler: RouteHandler, route: string, body?: unknown, options: Omit<CallOptions, "method" | "body"> = {}) {
    return this.call(handler, route, { ...options, method: "PATCH", body });
  }

  delete(handler: RouteHandler, route: string, options: Omit<CallOptions, "method" | "body"> = {}) {
    return this.call(handler, route, { ...options, method: "DELETE" });
  }

  /** Used to prove CSRF/origin enforcement without the browser conveniences. */
  async raw(
    handler: RouteHandler,
    route: string,
    options: { method?: string; body?: unknown; csrf?: boolean; origin?: string | null; params?: Record<string, string> } = {},
  ): Promise<ApiResult> {
    const method = options.method ?? "POST";
    const headers: Record<string, string> = {
      "x-forwarded-for": this.ip,
      "content-type": "application/json",
    };
    if (options.origin !== null) headers.origin = options.origin ?? BASE_URL;
    if (options.csrf) {
      const token = await this.ensureCsrf();
      headers["x-csrf-token"] = token;
    }
    const cookie = this.cookieHeader();
    if (cookie) headers.cookie = cookie;
    const request = new Request(`${BASE_URL}${route}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const response = options.params
      ? await handler(request, { params: Promise.resolve(options.params) })
      : await handler(request);
    this.capture(response);
    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: response.status, data, headers: response.headers };
  }
}

export type PublicForm = {
  form: {
    id: string;
    version: number;
    publishedAt: string | null;
    questions: {
      id: string;
      type: string;
      title: string;
      description: string;
      placeholder: string;
      required: boolean;
      enabled: boolean;
      options: string[];
      order: number;
    }[];
  } | null;
  config: {
    applicationsOpen: boolean;
    positionsEnabled: boolean;
    positions: string[];
    collectDiscord: boolean;
    allowMultiple: boolean;
    requireVerifiedEmail: boolean;
  };
};

export function answersForForm(form: PublicForm["form"]): Record<string, string | string[]> {
  if (!form) throw new Error("No published form available for the test submission");
  const answers: Record<string, string | string[]> = {};
  for (const question of form.questions) {
    switch (question.type) {
      case "SHORT_TEXT":
        answers[question.id] = "Nova";
        break;
      case "LONG_TEXT":
        answers[question.id] =
          "I have moderated communities for several years and enjoy calm, careful support work.";
        break;
      case "EMAIL":
        answers[question.id] = "nova.applicant@example.com";
        break;
      case "NUMBER":
        answers[question.id] = "12";
        break;
      case "SELECT":
      case "RADIO":
        answers[question.id] = question.options[0] ?? "Yes";
        break;
      case "CHECKBOX":
        answers[question.id] = question.options.slice(0, 2);
        break;
      case "YES_NO":
        answers[question.id] = "Yes";
        break;
      default:
        answers[question.id] = "Answer";
    }
  }
  return answers;
}

/** Re-runs the real deployment seed against the isolated test database. */
export function runSeed(): string {
  return execFileSync(path.resolve(process.cwd(), "node_modules/.bin/tsx"), ["scripts/seed.ts"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: TEST_DB_URL,
      OWNER_USERNAME: "admin",
      OWNER_INITIAL_PASSWORD: "admin",
      OWNER_EMAIL: "owner@topcloud.local",
    },
    encoding: "utf8",
  });
}
