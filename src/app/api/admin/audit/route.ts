import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handle, json, requireAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  return handle("admin.audit.list", async () => {
    await requireAdmin(req, "VIEW_AUDIT");
    const url = new URL(req.url);
    const page = Math.min(10_000, Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1));

    const [totalRows, rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(auditLogs),
      db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          actor: users.username,
          actorLabel: auditLogs.actorLabel,
          targetType: auditLogs.targetType,
          targetId: auditLogs.targetId,
          metadata: auditLogs.metadata,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorId, users.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
    ]);
    const total = Number(totalRows[0]?.count ?? 0);

    return json({
      logs: rows.map((log) => ({
        ...log,
        actor: log.actor ?? log.actorLabel ?? "System",
        createdAt: log.createdAt.toISOString(),
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
