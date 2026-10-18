import Link from "next/link";
import type { ReactNode } from "react";
import type { Brand } from "@/lib/brand";
import { BrandLockup } from "@/components/ui/logo";
import {
  ArrowLeftIcon,
  CheckIcon,
  LockIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ActivityIcon,
} from "@/components/ui/icons";

export function AuthShell({
  brand,
  variant = "member",
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  brand: Brand;
  variant?: "member" | "admin";
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
      <div className="pointer-events-none absolute -left-32 top-10 h-[420px] w-[420px] rounded-full bg-brand/18 blur-[130px]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-[360px] w-[360px] rounded-full bg-azure/12 blur-[120px]" />

      <div className="container-tc relative grid min-h-screen items-center gap-12 py-10 lg:grid-cols-[1fr_1.05fr] lg:gap-20 lg:py-14">
        <div className={`mx-auto w-full ${wide ? "max-w-xl" : "max-w-md"} lg:mx-0`}>
          <Link href="/" className="inline-flex items-center gap-2 text-xs text-muted transition hover:text-snow">
            <ArrowLeftIcon size={13} />
            Back to {brand.name}
          </Link>

          <div className="mt-8">
            <BrandLockup brand={brand} subtitle={variant === "admin" ? "Administration" : "Staff portal"} />
          </div>

          <div className="mt-9">
            <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-tight text-snow">
              {title}
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-mist">{subtitle}</p>
          </div>

          <div className="mt-7">{children}</div>

          {footer ? <div className="mt-6 text-sm text-mist">{footer}</div> : null}

          <p className="mt-10 flex items-center gap-2 text-[10.5px] text-muted">
            <LockIcon size={12} />
            Secure sessions · Argon2id hashes · CSRF protected
          </p>
        </div>

        <div className="relative hidden lg:block">
          <div className="relative mx-auto max-w-[520px]">
            <div className="pointer-events-none absolute -inset-8 rounded-[48px] bg-[radial-gradient(closest-side,rgba(139,92,246,0.22),transparent)] blur-2xl" />
            <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#070b18]/80 p-8 backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <span className="eyebrow">
                  <SparklesIcon size={12} />
                  {variant === "admin" ? "Restricted area" : "Member portal"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-wide text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Encrypted
                </span>
              </div>

              <h2 className="mt-8 font-display text-[2.4rem] font-semibold leading-[1.05] tracking-tight text-snow">
                A real team.
                <br />
                <span className="gradient-text">A real process.</span>
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-mist">
                {variant === "admin"
                  ? "The owner and authorized administrators review every application here. Permissions are checked on the server for every action."
                  : "Your applications, statuses, and reference numbers live in one calm dashboard. No refreshing your inbox hoping for a sign."}
              </p>

              <div className="mt-8 space-y-3">
                {(variant === "admin"
                  ? [
                      ["Granular permissions", "Admins see only what the owner assigns."],
                      ["Private review notes", "Never returned to member endpoints."],
                      ["Append-only audit log", "Every important action leaves a mark."],
                    ]
                  : [
                      ["Track every stage", "Six real statuses, updated by reviewers."],
                      ["Private by design", "Internal notes stay internal."],
                      ["One clear reference", "Every submission gets a TC reference."],
                    ]
                ).map(([titleText, body]) => (
                  <div key={titleText} className="flex items-start gap-3 rounded-xl border border-white/7 bg-white/[0.025] p-3.5">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/15 text-brand-bright">
                      <CheckIcon size={11} />
                    </span>
                    <div>
                      <p className="text-[12.5px] font-medium text-snow">{titleText}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-white/8 pt-5 text-[10.5px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheckIcon size={13} className="text-emerald-300" />
                  Zero-trust access checks
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ActivityIcon size={13} className="text-brand-bright" />
                  Audit logged
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
