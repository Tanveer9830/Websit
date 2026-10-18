import { STATUS_META, type ApplicationStatus } from "@/lib/constants";

export function StatusBadge({
  status,
  size = "sm",
}: {
  status: string;
  size?: "sm" | "lg";
}) {
  const meta = STATUS_META[status as ApplicationStatus] ?? STATUS_META.PENDING;
  return (
    <span
      className={`status-badge ${meta.cssClass} ${size === "lg" ? "status-badge-lg" : ""}`}
      title={meta.description}
    >
      {meta.label}
    </span>
  );
}

export function statusClass(status: string): string {
  const meta = STATUS_META[status as ApplicationStatus] ?? STATUS_META.PENDING;
  return meta.cssClass;
}
