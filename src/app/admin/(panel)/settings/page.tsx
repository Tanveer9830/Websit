import type { Metadata } from "next";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { requireAdminPage } from "@/lib/page-auth";
import { hasPermission } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { SettingsTabs } from "@/components/admin/settings-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { ShieldCheckIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Settings" };

const AUDIT_PAGE_SIZE = 50;

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requireAdminPage("/admin/settings");
  const settings = await getSettings();
  const isOwner = auth.user.role === "OWNER";
  const canManageSettings = hasPermission(auth.user, "MANAGE_SETTINGS");
  const canViewAudit = hasPermission(auth.user, "VIEW_AUDIT");

  const raw = await searchParams;
  const pick = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const requestedTab = pick("tab");
  const initialTab =
    requestedTab === "branding" || requestedTab === "application" || requestedTab === "audit" || requestedTab === "account"
      ? requestedTab
      : canManageSettings
        ? "branding"
        : "account";
  const auditPage = Math.min(
    10_000,
    Math.max(1, Number.parseInt(pick("page") ?? "1", 10) || 1),
  );

  let audit: {
    logs: {
      id: string;
      action: string;
      actor: string;
      targetType: string | null;
      targetId: string | null;
      metadata: string | null;
      createdAt: string;
    }[];
    page: number;
    pages: number;
    total: number;
    pageSize: number;
  } | null = null;

  if (canViewAudit) {
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
        .limit(AUDIT_PAGE_SIZE)
        .offset((auditPage - 1) * AUDIT_PAGE_SIZE),
    ]);
    const total = Number(totalRows[0]?.count ?? 0);
    audit = {
      logs: rows.map((row) => ({
        id: row.id,
        action: row.action,
        actor: row.actor ?? row.actorLabel ?? "System",
        targetType: row.targetType,
        targetId: row.targetId,
        metadata: row.metadata,
        createdAt: row.createdAt.toISOString(),
      })),
      page: auditPage,
      pages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
      total,
      pageSize: AUDIT_PAGE_SIZE,
    };
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Configuration"
        title="Panel settings."
        description="Branding, application rules and notifications are database-backed and applied instantly. Security actions are audited and enforced server-side."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] text-mist">
            <ShieldCheckIcon size={12} className="text-emerald-300" />
            {canManageSettings ? "Settings access" : "Account only"}
          </span>
        }
      />

      <SettingsTabs
        settings={settings}
        user={{
          id: auth.user.id,
          username: auth.user.username,
          email: auth.user.email,
          role: auth.user.role,
          emailVerified: Boolean(auth.user.emailVerifiedAt),
          permissions: auth.user.permissions,
        }}
        isOwner={isOwner}
        canManageSettings={canManageSettings}
        canViewAudit={canViewAudit}
        initialTab={initialTab}
        audit={audit}
      />

      <p className="text-[10px] leading-relaxed text-muted">
        The owner account can change its own username, email and password, but cannot be demoted, disabled or deleted
        through this panel. Default owner credentials are seeded once; re-running setup never resets them.
      </p>
    </div>
  );
}
