import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handle, json, requireAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export async function GET(req: Request) {
  return handle("admin.members.list", async () => {
    await requireAdmin(req, "MANAGE_MEMBERS");
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    const roleParam = url.searchParams.get("role") ?? "ALL";
    const role = ["ALL", "MEMBER", "ADMIN", "OWNER"].includes(roleParam) ? roleParam : "ALL";
    const page = Math.min(10_000, Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1));

    const conditions = [];
    if (role !== "ALL") conditions.push(eq(users.role, role));
    if (q) {
      const needle = `%${q}%`;
      conditions.push(or(like(users.username, needle), like(users.email, needle), like(users.id, needle))!);
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const applicationCount = sql<number>`(select count(*) from "applications" where "applications"."user_id" = "users"."id")`;

    const [totalRows, rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users).where(where),
      db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          role: users.role,
          permissions: users.permissions,
          emailVerifiedAt: users.emailVerifiedAt,
          mustChangePassword: users.mustChangePassword,
          isDisabled: users.isDisabled,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
          applicationCount,
        })
        .from(users)
        .where(where)
        .orderBy(asc(users.role), desc(users.createdAt))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
    ]);
    const total = Number(totalRows[0]?.count ?? 0);

    return json({
      members: rows.map((member) => ({
        ...member,
        applicationCount: Number(member.applicationCount),
        emailVerifiedAt: member.emailVerifiedAt?.toISOString() ?? null,
        createdAt: member.createdAt.toISOString(),
        lastLoginAt: member.lastLoginAt?.toISOString() ?? null,
      })),
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      },
    });
  });
}
