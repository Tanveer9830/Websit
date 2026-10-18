import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

export function Pagination({
  page,
  pages,
  hrefFor,
  total,
  pageSize,
  noun = "result",
}: {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
  total?: number;
  pageSize?: number;
  noun?: string;
}) {
  const from = total && pageSize ? (total === 0 ? 0 : (page - 1) * pageSize + 1) : null;
  const to = total && pageSize ? Math.min(page * pageSize, total) : null;

  return (
    <div className="flex flex-col gap-3 border-t border-white/8 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[10px] text-muted">
        {total !== undefined && from !== null && to !== null
          ? `Showing ${from}–${to} of ${total} ${noun}${total === 1 ? "" : "s"}`
          : `Page ${page} of ${pages}`}
      </p>
      <div className="flex items-center gap-1.5">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className="btn btn-secondary btn-sm" aria-label="Previous page">
            <ChevronLeftIcon size={13} />
            Previous
          </Link>
        ) : (
          <span className="btn btn-secondary btn-sm cursor-not-allowed opacity-40" aria-disabled="true">
            <ChevronLeftIcon size={13} />
            Previous
          </span>
        )}
        <span className="px-2 font-mono text-[10px] text-muted">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Link href={hrefFor(page + 1)} className="btn btn-secondary btn-sm" aria-label="Next page">
            Next
            <ChevronRightIcon size={13} />
          </Link>
        ) : (
          <span className="btn btn-secondary btn-sm cursor-not-allowed opacity-40" aria-disabled="true">
            Next
            <ChevronRightIcon size={13} />
          </span>
        )}
      </div>
    </div>
  );
}
