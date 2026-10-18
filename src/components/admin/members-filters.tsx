"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { RefreshIcon, SearchIcon } from "@/components/ui/icons";

export function MembersFilters({ query, role }: { query: string; role: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const hasFilters = Boolean(query) || role !== "ALL";

  return (
    <form ref={formRef} method="get" action="/admin/members" className="flex flex-col gap-2.5 sm:flex-row">
      <div className="relative min-w-0 flex-1">
        <SearchIcon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search username, email or member ID…"
          className="input pl-10"
          maxLength={100}
          aria-label="Search members"
        />
      </div>
      <div className="flex gap-2.5">
        <select
          name="role"
          defaultValue={role}
          onChange={() => formRef.current?.requestSubmit()}
          className="select w-auto min-w-[142px]"
          aria-label="Filter by role"
        >
          <option value="ALL">All roles</option>
          <option value="OWNER">Owner</option>
          <option value="ADMIN">Administrators</option>
          <option value="MEMBER">Members</option>
        </select>
        <button type="submit" className="btn btn-primary btn-sm h-[42px]">
          Search
        </button>
        {hasFilters ? (
          <button type="button" onClick={() => router.push("/admin/members")} className="btn btn-ghost btn-sm h-[42px]">
            <RefreshIcon size={14} />
            Reset
          </button>
        ) : null}
      </div>
    </form>
  );
}
