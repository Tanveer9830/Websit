import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { LockIcon } from "@/components/ui/icons";

export function AccessDenied({
  title = "You don't have access to this area.",
  description = "Your administrator role doesn't include this permission. The server rejects the underlying requests too — this isn't just a hidden link. Ask the owner if you need access.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="card p-6 sm:p-10">
      <EmptyState
        icon={<LockIcon size={24} />}
        title={title}
        description={description}
        action={
          <Link href="/admin" className="btn btn-secondary">
            Back to overview
          </Link>
        }
      />
    </div>
  );
}
