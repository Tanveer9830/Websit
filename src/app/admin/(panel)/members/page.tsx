import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdminPage } from "@/lib/page-auth";
import { hasPermission, parsePermissions, primaryRoleLabel } from "@/lib/permissions";
import { formatDate, formatDateTime, shortId } from "@/lib/format";
import { AccessDenied } from "@/components/admin/access-denied";
import { MemberActions } from "@/components/admin/member-actions";
import { MembersFilters } from "@/components/admin/members-filters";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { CopyButton } from "@/components/ui/copy-button";
import {
  CheckCircleIcon,
  KeyIcon,
  SearchIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = { title: "Members" };

const PAGE_SIZE = 20;

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requireAdminPage("/admin/members");
  if (!hasPermission(auth.user, "MANAGE_MEMBERS")) {
    return <AccessDenied title="The member directory is restricted." />;
  }

  const raw = await searchParams;
  const pick = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const q = (pick("q") ?? "").trim().slice(0, 100);
  const roleParam = pick("role") ?? "ALL";
  const role = ["ALL", "MEMBER", "ADMIN", "OWNER"].includes(roleParam) ? roleParam : "ALL";
  const page = Math.min(10_000, Math.max(1, Number.parseInt(pick("page") ?? "1", 10) || 1));

  const conditions = [];
  if (role !== "ALL") conditions.push(eq(users.role, role));
  if (q) {
    const needle = `%${q}%`;
    conditions.push(or(like(users.username, needle), like(users.email, needle), like(users.id, needle))!);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const applicationCount = sql<number>`(select count(*) from "applications" where "applications"."user_id" = "users"."id")`;

  const [totalRows, rows, roleRows] = await Promise.all([
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
    db.select({ role: users.role, count: sql<number>`count(*)` }).from(users).groupBy(users.role),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const roleCounts = Object.fromEntries(roleRows.map((row) => [row.role, Number(row.count)]));
  const ownerViewer = auth.user.role === "OWNER";
  const hrefFor = (nextPage: number) => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (role !== "ALL") search.set("role", role);
    if (nextPage > 1) search.set("page", String(nextPage));
    const query = search.toString();
    return `/admin/members${query ? `?${query}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Directory"
        title="Members & access."
        description="Every registered account, its real role, verification state and application count. Only the owner can grant admin rights, change permissions, or disable an account."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] text-mist">
            <ShieldCheckIcon size={12} className={ownerViewer ? "text-emerald-300" : "text-amber-300"} />
            {ownerViewer ? "Owner controls enabled" : "View only · owner required"}
          </span>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "All accounts", value: total, icon: <UsersIcon size={15} />, color: "#a78bfa" },
          { label: "Members", value: roleCounts.MEMBER ?? 0, icon: <UserIcon size={15} />, color: "#60a5fa" },
          { label: "Administrators", value: roleCounts.ADMIN ?? 0, icon: <KeyIcon size={15} />, color: "#22d3ee" },
          { label: "Owner", value: roleCounts.OWNER ?? 0, icon: <ShieldCheckIcon size={15} />, color: "#fbbf24" },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center gap-3 p-4">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border"
              style={{ color: stat.color, borderColor: `${stat.color}30`, backgroundColor: `${stat.color}12` }}
            >
              {stat.icon}
            </span>
            <div>
              <p className="font-display text-xl font-semibold leading-none text-snow">{stat.value}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-muted">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <MembersFilters query={q} role={role} />
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3.5 sm:px-5">
          <p className="text-[11px] text-mist">
            <span className="font-semibold text-snow">{total}</span> account{total === 1 ? "" : "s"} match
            {q ? (
              <>
                {" "}
                for <span className="font-mono text-brand-bright">“{q}”</span>
              </>
            ) : (
              " this filter"
            )}
          </p>
          <p className="inline-flex items-center gap-1.5 text-[9.5px] text-muted">
            <ShieldCheckIcon size={11} className="text-emerald-300" />
            Emails visible to authorized admins only
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<SearchIcon size={22} />}
              title="No accounts match"
              description="Try a different username, email, member ID or role filter."
              action={
                <Link href="/admin/members" className="btn btn-secondary btn-sm">
                  Clear filters
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <div className="data-table hidden lg:block">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Role</th>
                    <th>Permissions</th>
                    <th>Applications</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((member) => {
                    const perms = parsePermissions(member.permissions);
                    return (
                      <tr key={member.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[9px] font-bold text-white ${
                                member.role === "OWNER"
                                  ? "bg-[linear-gradient(135deg,#f59e0b,#f97316)]"
                                  : member.role === "ADMIN"
                                    ? "bg-[linear-gradient(135deg,var(--brand-from),var(--brand-to))]"
                                    : "bg-white/8 text-mist"
                              }`}
                            >
                              {member.username.slice(0, 2).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 truncate text-[11.5px] font-semibold text-snow">
                                {member.username}
                                {member.id === auth.user.id ? (
                                  <span className="rounded border border-white/10 px-1 py-0.5 text-[7.5px] uppercase text-muted">
                                    You
                                  </span>
                                ) : null}
                              </p>
                              <p className="truncate text-[9px] text-muted">{member.email}</p>
                              <p className="font-mono text-[8px] text-white/25">{shortId(member.id)}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide ${
                              member.role === "OWNER"
                                ? "border-amber-300/25 bg-amber-300/[0.08] text-amber-200"
                                : member.role === "ADMIN"
                                  ? "border-brand/30 bg-brand/10 text-brand-bright"
                                  : "border-white/10 bg-white/[0.03] text-mist"
                            }`}
                          >
                            {primaryRoleLabel(member.role)}
                          </span>
                        </td>
                        <td>
                          {member.role === "ADMIN" ? (
                            <div className="flex max-w-[180px] flex-wrap gap-1">
                              {perms.length === 0 ? (
                                <span className="text-[9px] text-muted">None</span>
                              ) : (
                                perms.slice(0, 3).map((permission) => (
                                  <span
                                    key={permission}
                                    className="rounded border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[8px] text-muted"
                                  >
                                    {permission.replaceAll("_", " ").toLowerCase()}
                                  </span>
                                ))
                              )}
                              {perms.length > 3 ? (
                                <span className="text-[8px] text-muted">+{perms.length - 3}</span>
                              ) : null}
                            </div>
                          ) : member.role === "OWNER" ? (
                            <span className="text-[9px] text-amber-200/70">Full control</span>
                          ) : (
                            <span className="text-[9px] text-muted">Member access</span>
                          )}
                        </td>
                        <td className="font-mono text-[10px] text-mist">{Number(member.applicationCount)}</td>
                        <td>
                          {member.isDisabled ? (
                            <span className="rounded-full border border-rose-400/20 bg-rose-400/[0.06] px-2 py-0.5 text-[8.5px] font-medium text-rose-300">
                              Disabled
                            </span>
                          ) : member.emailVerifiedAt ? (
                            <span className="inline-flex items-center gap-1 text-[8.5px] text-emerald-300">
                              <CheckCircleIcon size={9} /> Verified
                            </span>
                          ) : (
                            <span className="text-[8.5px] text-amber-300">Unverified</span>
                          )}
                          <p className="mt-1 text-[8px] text-muted">
                            {member.lastLoginAt ? `Seen ${formatDate(member.lastLoginAt)}` : "Never signed in"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap text-[9.5px] text-muted">{formatDate(member.createdAt)}</td>
                        <td>
                          <div className="flex items-center justify-end gap-2">
                            {member.role === "OWNER" ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-2 py-1 text-[8.5px] font-semibold uppercase tracking-wide text-amber-200">
                                <ShieldCheckIcon size={9} />
                                Protected
                              </span>
                            ) : ownerViewer ? (
                              <MemberActions member={member} />
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[8.5px] uppercase tracking-wide text-muted">
                                <KeyIcon size={9} /> Owner only
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-white/7 lg:hidden">
              {rows.map((member) => {
                const perms = parsePermissions(member.permissions);
                return (
                  <article key={member.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-snow">{member.username}</p>
                        <p className="truncate text-[9.5px] text-muted">{member.email}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[8px] font-semibold uppercase ${
                              member.role === "OWNER"
                                ? "border-amber-300/25 bg-amber-300/[0.08] text-amber-200"
                                : member.role === "ADMIN"
                                  ? "border-brand/30 bg-brand/10 text-brand-bright"
                                  : "border-white/10 bg-white/[0.03] text-mist"
                            }`}
                          >
                            {primaryRoleLabel(member.role)}
                          </span>
                          {member.isDisabled ? (
                            <span className="text-[8px] text-rose-300">Disabled</span>
                          ) : null}
                          {member.emailVerifiedAt ? (
                            <span className="inline-flex items-center gap-0.5 text-[8px] text-emerald-300">
                              <CheckCircleIcon size={8} /> Verified
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-[8.5px] text-muted">
                          {Number(member.applicationCount)} application{Number(member.applicationCount) === 1 ? "" : "s"} ·
                          joined {formatDate(member.createdAt)}
                        </p>
                        {member.role === "ADMIN" && perms.length > 0 ? (
                          <p className="mt-1 text-[8px] text-muted">
                            {perms.map((permission) => permission.replaceAll("_", " ").toLowerCase()).join(" · ")}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <CopyButton value={member.id} iconOnly label="Copy member ID" />
                        {member.role === "OWNER" ? (
                          <span className="inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wide text-amber-200">
                            <ShieldCheckIcon size={9} /> Protected
                          </span>
                        ) : ownerViewer ? (
                          <MemberActions member={member} />
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[8px] uppercase tracking-wide text-muted">
                            <KeyIcon size={9} /> Owner only
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {rows.length > 0 ? (
          <Pagination
            page={page}
            pages={pages}
            total={total}
            pageSize={PAGE_SIZE}
            noun="account"
            hrefFor={hrefFor}
          />
        ) : null}
      </section>

      <div className="flex flex-col gap-2 text-[10px] leading-relaxed text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="inline-flex items-start gap-1.5">
          <ShieldCheckIcon size={11} className="mt-0.5 shrink-0 text-emerald-300" />
          Role changes revoke the target&apos;s sessions and require a fresh password before admin access.
        </p>
        <p className="inline-flex items-center gap-1.5">
          <UserIcon size={11} />
          Owner account is immutable from the UI.
        </p>
      </div>
    </div>
  );
}
