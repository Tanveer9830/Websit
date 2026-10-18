import type { ReactNode } from "react";
import { AlertTriangleIcon, CheckCircleIcon, InboxIcon, ShieldCheckIcon } from "./icons";

type Tone = "info" | "success" | "warning" | "danger";

const TONE: Record<Tone, { wrap: string; icon: ReactNode }> = {
  info: {
    wrap: "border-sky-400/25 bg-sky-400/[0.07] text-sky-100",
    icon: <InboxIcon size={17} className="text-sky-300" />,
  },
  success: {
    wrap: "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-100",
    icon: <CheckCircleIcon size={17} className="text-emerald-300" />,
  },
  warning: {
    wrap: "border-amber-400/25 bg-amber-400/[0.07] text-amber-100",
    icon: <AlertTriangleIcon size={17} className="text-amber-300" />,
  },
  danger: {
    wrap: "border-rose-400/25 bg-rose-400/[0.07] text-rose-100",
    icon: <ShieldCheckIcon size={17} className="text-rose-300" />,
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
  className = "",
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const config = TONE[tone];
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm leading-relaxed ${config.wrap} ${className}`}
    >
      <span className="mt-0.5 shrink-0">{config.icon}</span>
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? "mt-0.5 opacity-90" : "opacity-90"}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}
