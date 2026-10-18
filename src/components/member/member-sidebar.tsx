"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Brand } from "@/lib/brand";
import { BrandLockup } from "@/components/ui/logo";
import { LogoutButton } from "@/components/ui/logout-button";
import { initials } from "@/lib/format";
import {
  ClipboardIcon,
  FileTextIcon,
  LayoutIcon,
  MailIcon,
  MenuIcon,
  ShieldCheckIcon,
  UserIcon,
  XIcon,
} from "@/components/ui/icons";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutIcon },
  { href: "/apply", label: "Apply for staff", icon: ClipboardIcon },
  { href: "/my-applications", label: "My applications", icon: FileTextIcon },
  { href: "/profile", label: "Profile & security", icon: UserIcon },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MemberSidebar({
  brand,
  user,
  supportEmail,
  panelAccess,
}: {
  brand: Brand;
  user: { id: string; username: string; email: string; emailVerified: boolean };
  supportEmail: string;
  panelAccess: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-[76px] items-center justify-between px-5">
        <Link href="/dashboard" aria-label={`${brand.name} dashboard`}>
          <BrandLockup brand={brand} subtitle="Member portal" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-mist lg:hidden"
          aria-label="Close menu"
        >
          <XIcon size={15} />
        </button>
      </div>

      <div className="px-4 pt-3">
        <p className="px-2 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-muted">Workspace</p>
        <nav className="mt-2 space-y-1" aria-label="Member navigation">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? "nav-link-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} className={active ? "text-brand-bright" : "text-muted"} />
                <span>{item.label}</span>
                {item.href === "/apply" ? (
                  <span className="ml-auto rounded-full border border-brand/25 bg-brand/10 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-brand-bright">
                    Open
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      {panelAccess ? (
        <div className="px-4 pt-5">
          <p className="px-2 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-muted">Administration</p>
          <Link href="/admin" className="nav-link mt-2">
            <ShieldCheckIcon size={17} className="text-amber-300" />
            <span>Admin panel</span>
          </Link>
        </div>
      ) : null}

      <div className="mt-auto space-y-3 px-4 pb-5">
        <div className="rounded-2xl border border-white/8 bg-[linear-gradient(135deg,rgba(139,92,246,0.12),rgba(59,130,246,0.05))] p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-snow">
            <MailIcon size={13} className="text-brand-bright" />
            Need a hand?
          </div>
          <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
            Questions about your application? Ask the team.
          </p>
          <a
            href={`mailto:${supportEmail}`}
            className="mt-2 inline-block truncate text-[10.5px] font-medium text-brand-bright hover:text-white"
          >
            {supportEmail}
          </a>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--brand-from),var(--brand-to))] text-[11px] font-bold text-white">
              {initials(user.username)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-snow">{user.username}</p>
              <p className="truncate text-[9.5px] text-muted">
                {user.emailVerified ? "Email verified" : "Email unverified"} · Member
              </p>
            </div>
          </div>
          <LogoutButton className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11.5px] font-medium text-muted transition hover:bg-white/5 hover:text-snow" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex h-[64px] items-center justify-between border-b border-white/8 bg-night/85 px-4 backdrop-blur-2xl lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-snow"
          aria-label="Open menu"
          aria-expanded={open}
        >
          <MenuIcon size={18} />
        </button>
        <Link href="/dashboard" aria-label="Dashboard">
          <BrandLockup brand={brand} size={30} subtitle="Member" />
        </Link>
        <Link
          href="/profile"
          className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--brand-from),var(--brand-to))] text-[10px] font-bold text-white"
          aria-label="Profile"
        >
          {initials(user.username)}
        </Link>
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] border-r border-white/8 bg-[#060a16]/85 backdrop-blur-2xl lg:block">
        {sidebar}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />
          <aside className="relative h-full w-[290px] animate-scale-in border-r border-white/10 bg-[#060a16] shadow-2xl">
            {sidebar}
          </aside>
        </div>
      ) : null}
    </>
  );
}
