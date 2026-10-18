import Link from "next/link";
import type { Brand } from "@/lib/brand";
import { BrandLockup } from "@/components/ui/logo";
import { ArrowUpRightIcon, MailIcon } from "@/components/ui/icons";

export function PublicFooter({
  brand,
  applicationsOpen,
  positions,
}: {
  brand: Brand;
  applicationsOpen: boolean;
  positions: string[];
}) {
  return (
    <footer className="relative mt-24 border-t border-white/8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent" />
      <div className="container-tc grid gap-12 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <BrandLockup brand={brand} subtitle="Staff portal" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-mist">
            {brand.tagline} A focused recruitment portal for the people who keep our communities running.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[11px] text-mist">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                applicationsOpen ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-amber-400"
              }`}
            />
            Applications {applicationsOpen ? "open" : "paused"}
          </p>
        </div>

        <div>
          <p className="mb-4 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted">Portal</p>
          <ul className="space-y-2.5 text-sm text-mist">
            <li><Link href="/" className="transition hover:text-snow">Home</Link></li>
            <li><Link href="/register" className="transition hover:text-snow">Create an account</Link></li>
            <li><Link href="/login" className="transition hover:text-snow">Member sign in</Link></li>
            <li><Link href="/dashboard" className="transition hover:text-snow">My dashboard</Link></li>
            <li><Link href="/admin/login" className="transition hover:text-snow">Admin panel</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-4 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted">Teams</p>
          {positions.length > 0 ? (
            <ul className="space-y-2.5 text-sm text-mist">
              {positions.slice(0, 6).map((position) => (
                <li key={position} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-brand-bright/70" />
                  {position}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Positions are announced before each hiring round.</p>
          )}
          <a
            href={`mailto:${brand.supportEmail}`}
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-snow transition hover:text-brand-bright"
          >
            <MailIcon size={15} />
            {brand.supportEmail}
            <ArrowUpRightIcon size={13} />
          </a>
        </div>
      </div>

      <div className="border-t border-white/6">
        <div className="container-tc flex flex-col gap-3 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {brand.name}. Staff applications only — no hosting purchases, billing, or server management.</p>
          <p className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-bright" />
            Built for people, not spam folders.
          </p>
        </div>
      </div>
    </footer>
  );
}
