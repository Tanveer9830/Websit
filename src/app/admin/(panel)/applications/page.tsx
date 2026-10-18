import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, users } from "@/db/schema";
import { requireAdminPage } from "@/lib/page-auth";
import { hasPermission } from "@/lib/permissions";
import { adminSearchSchema } from "@/lib/validation";
import { STATUS_META } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { AccessDenied } from "@/components/admin/access-denied";
import { ApplicationsFilters } from "@/components/admin/applications-filters";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  ArrowRightIcon,
  ClipboardIcon,
  SearchIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = { title: "Applications" };

const PAGE_SIZE = 15;

function hrefFor(params: { q: string; status: string; sort: string }, page: number) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status !== "ALL") search.set("status", params.status);
  if (params.sort !== "newest") search.set("sort", params.sort);
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return `/admin/applications${query ? `?${query}` : ""}`;
}

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requireAdminPage("/admin/applications");
  if (!hasPermission(auth.user, "REVIEW_APPLICATIONS")) {
    return <AccessDenied title="Applications are restricted." />;
  }

  const raw = await searchParams;
  const pick = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const parsed = adminSearchSchema.safeParse({
    q: pick("q") ?? "",
    status: pick("status") ?? "ALL",
    sort: pick("sort") ?? "newest",
    page: pick("page") ?? 1,
  });
  const input = parsed.success ? parsed.data : { q: "", status: "ALL" as const, sort: "newest" as const, page: 1 };

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
        username: users.username,
        email: users.email,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(applications)
      .innerJoin(users, eq(applications.userId, users.id))
      .where(where)
      .orderBy(input.sort === "oldest" ? asc(applications.submittedAt) : desc(applications.submittedAt))
      .limit(PAGE_SIZE)
      .offset((input.page - 1) * PAGE_SIZE),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filterParams = { q: input.q, status: input.status, sort: input.sort };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Review queue"
        title="Applications."
        description="Search across every submitted application, filter by real status, and open a submission for the full answer snapshot and review controls."
        actions={
          <Link href="/admin/questions" className="btn btn-secondary">
            <ClipboardIcon size={15} />
            Manage form
          </Link>
        }
      />

      <div className="card p-4">
        <ApplicationsFilters query={input.q} status={input.status} sort={input.sort} />
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/7 pt-3">
          <span className="text-[9.5px] uppercase tracking-[0.13em] text-muted">Quick filters</span>
          <Link
            href="/admin/applications"
            className={`rounded-full border px-2.5 py-1 text-[10px] transition ${
              input.status === "ALL"
                ? "border-brand/35 bg-brand/12 text-brand-bright"
                : "border-white/8 bg-white/[0.02] text-muted hover:text-snow"
            }`}
          >
            All
          </Link>
          {(["PENDING", "REVIEWING", "UNDER_CONSIDERATION", "ON_HOLD", "APPROVED", "REJECTED"] as const).map((status) => (
            <Link
              key={status}
              href={hrefFor({ ...filterParams, status }, 1)}
              className={`rounded-full border px-2.5 py-1 text-[10px] transition ${
                input.status === status
                  ? "border-brand/35 bg-brand/12 text-brand-bright"
                  : "border-white/8 bg-white/[0.02] text-muted hover:text-snow"
              }`}
            >
              {STATUS_META[status].label}
            </Link>
          ))}
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3.5 sm:px-5">
          <p className="text-[11px] text-mist">
            <span className="font-semibold text-snow">{total}</span> application{total === 1 ? "" : "s"} match
            {input.q ? (
              <>
                {" "}
                for <span className="font-mono text-brand-bright">“{input.q}”</span>
              </>
            ) : (
              " your filters"
            )}
          </p>
          <span className="inline-flex items-center gap-1.5 text-[9.5px] text-muted">
            <ShieldCheckIcon size={11} className="text-emerald-300" />
            Server-side filters · keyset-safe queries
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<SearchIcon size={22} />}
              title="No applications match"
              description="Try a broader search, clear the status filter, or switch the sort order. Nothing is hidden from a permitted admin."
              action={
                <Link href="/admin/applications" className="btn btn-secondary btn-sm">
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
                    <th>Reference</th>
                    <th>Applicant</th>
                    <th>Team</th>
                    <th>Discord</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link
                          href={`/admin/applications/${row.id}`}
                          className="font-mono text-[11px] font-semibold text-snow transition hover:text-brand-bright"
                        >
                          {row.reference}
                        </Link>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-[8.5px] font-semibold text-mist">
                            {row.username.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[11.5px] font-medium text-snow">{row.username}</p>
                            <p className="truncate text-[9px] text-muted">{row.email}</p>
                          </div>
                          {row.emailVerifiedAt ? (
                            <ShieldCheckIcon size={11} className="shrink-0 text-emerald-300" aria-label="Email verified" />
                          ) : null}
                        </div>
                      </td>
                      <td className="text-[11px] text-mist">{row.position ?? "—"}</td>
                      <td className="max-w-[140px] truncate font-mono text-[10px] text-muted">
                        {row.discordUsername || row.discordId || "—"}
                      </td>
                      <td><StatusBadge status={row.status} size="sm" /></td>
                      <td className="whitespace-nowrap text-[10px] text-muted">{formatDate(row.submittedAt)}</td>
                      <td>
                        <Link
                          href={`/admin/applications/${row.id}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 bg-white/[0.02] text-muted transition hover:border-brand/30 hover:text-brand-bright"
                          aria-label={`Review ${row.reference}`}
                        >
                          <ArrowRightIcon size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-white/7 lg:hidden">
              {rows.map((row) => (
                <Link
                  key={row.id}
                  href={`/admin/applications/${row.id}`}
                  className="block px-4 py-4 transition hover:bg-white/[0.025]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] font-semibold text-snow">{row.reference}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-mist">
                        <UserIcon size={11} />
                        {row.username}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {row.position ?? "No team"} · {formatDateTime(row.submittedAt)}
                      </p>
                    </div>
                    <StatusBadge status={row.status} size="sm" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {rows.length > 0 ? (
          <Pagination
            page={input.page}
            pages={pages}
            total={total}
            pageSize={PAGE_SIZE}
            noun="application"
            hrefFor={(page) => hrefFor(filterParams, page)}
          />
        ) : null}
      </section>

      <p className="text-[10px] text-muted">
        Search covers username, email, reference, Discord username/ID and team. Private notes are never included in list
        responses.
      </p>
    </div>
  );
}
