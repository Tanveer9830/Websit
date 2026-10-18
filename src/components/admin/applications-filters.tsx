"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { APPLICATION_STATUSES, STATUS_META } from "@/lib/constants";
import { FilterIcon, RefreshIcon, SearchIcon } from "@/components/ui/icons";

export function ApplicationsFilters({
  query,
  status,
  sort,
}: {
  query: string;
  status: string;
  sort: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const hasFilters = Boolean(query) || status !== "ALL" || sort !== "newest";

  function apply() {
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      method="get"
      action="/admin/applications"
      className="flex flex-col gap-2.5 lg:flex-row lg:items-center"
    >
      <div className="relative min-w-0 flex-1">
        <SearchIcon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by username, reference, Discord ID, team or email…"
          className="input pl-10"
          maxLength={100}
          aria-label="Search applications"
        />
      </div>
      <div className="flex flex-wrap gap-2.5">
        <select
          name="status"
          defaultValue={status}
          onChange={apply}
          className="select w-auto min-w-[154px]"
          aria-label="Filter by status"
        >
          <option value="ALL">All statuses</option>
          {APPLICATION_STATUSES.map((option) => (
            <option key={option} value={option}>
              {STATUS_META[option].label}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          onChange={apply}
          className="select w-auto min-w-[130px]"
          aria-label="Sort applications"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <button type="submit" className="btn btn-primary btn-sm h-[42px]">
          <FilterIcon size={14} />
          Apply
        </button>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => router.push("/admin/applications")}
            className="btn btn-ghost btn-sm h-[42px]"
          >
            <RefreshIcon size={14} />
            Reset
          </button>
        ) : null}
      </div>
    </form>
  );
}
