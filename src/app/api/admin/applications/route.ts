import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, users } from "@/db/schema";
import { handle, json, requireAdmin } from "@/lib/api";
import { adminSearchSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export async function GET(req: Request) {
  return handle("admin.applications.list", async () => {
    await requireAdmin(req, "REVIEW_APPLICATIONS");
    const url = new URL(req.url);
    const input = adminSearchSchema.parse({
      q: url.searchParams.get("q") ?? "",
      status: url.searchParams.get("status") ?? "ALL",
      sort: url.searchParams.get("sort") ?? "newest",
      page: url.searchParams.get("page") ?? 1,
    });

    const conditions = [];
    if (input.status !== "ALL") conditions.push(eq(applications.status, input.status));
    if (input.q) {
      const needle = `%${input.q}%`;
      conditions.push(
        or(
          like(applications.reference, needle),
          like(applications.discordUsername, needle),
          like(applications.discordId, needle),
          like(applications.position, needle),
          like(users.username, needle),
          like(users.email, needle),
        )!,
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRows, rows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(applications)
        .innerJoin(users, eq(applications.userId, users.id))
        .where(where),
      db
        .select({
          id: applications.id,
          reference: applications.reference,
          status: applications.status,
          position: applications.position,
          discordUsername: applications.discordUsername,
          discordId: applications.discordId,
          submittedAt: applications.submittedAt,
          updatedAt: applications.updatedAt,
          userId: users.id,
          username: users.username,
          email: users.email,
        })
        .from(applications)
        .innerJoin(users, eq(applications.userId, users.id))
        .where(where)
        .orderBy(input.sort === "oldest" ? asc(applications.submittedAt) : desc(applications.submittedAt))
        .limit(PAGE_SIZE)
        .offset((input.page - 1) * PAGE_SIZE),
    ]);
    const total = Number(totalRows[0]?.count ?? 0);

    return json({
      applications: rows.map((row) => ({
        ...row,
        submittedAt: row.submittedAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        user: { id: row.userId, username: row.username, email: row.email },
      })),
      pagination: {
        page: input.page,
        pageSize: PAGE_SIZE,
        total,
        pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      },
    });
  });
}
