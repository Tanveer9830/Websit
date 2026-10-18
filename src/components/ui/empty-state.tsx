import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.018] text-center ${
        compact ? "px-5 py-9" : "px-6 py-16"
      }`}
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-2xl bg-brand/25 blur-2xl" />
        <div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-brand-bright">
          {icon}
        </div>
      </div>
      <h3 className="font-display text-base font-semibold text-snow">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-mist">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
