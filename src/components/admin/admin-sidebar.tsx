"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Brand } from "@/lib/brand";
import { BrandLockup } from "@/components/ui/logo";
import { LogoutButton } from "@/components/ui/logout-button";
import { initials } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import {
  ClipboardIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  KeyIcon,
  LayersIcon,
  LayoutIcon,
  MenuIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UsersIcon,
  XIcon,
} from "@/components/ui/icons";

type NavItem = {
  href: string;
  label: string;
  icon: (props: { size?: number; className?: string }) => ReactNode;
  permission?: "REVIEW_APPLICATIONS" | "MANAGE_QUESTIONS" | "MANAGE_MEMBERS";
  exact?: boolean;
};

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Control room",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutIcon, exact: true },
      {
        href: "/admin/applications",
        label: "Applications",
        icon: ClipboardIcon,
        permission: "REVIEW_APPLICATIONS",
      },
      {
        href: "/admin/questions",
        label: "Form builder",
        icon: LayersIcon,
        permission: "MANAGE_QUESTIONS",
      },
      {
        href: "/admin/members",
        label: "Members",
        icon: UsersIcon,
        permission: "MANAGE_MEMBERS",
      },
    ],
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminSidebar({
  brand,
  user,
  emailVerified,
}: {
  brand: Brand;
  user: { id: string; username: string; email: string; role: string; permissions: string };
  emailVerified: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const owner = user.role === "OWNER";

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

  const settingsVisible = true; // Every admin can reach their account settings.

  const panel = (
    <div className="flex h-full flex-col">
      <div className="flex h-[78px] items-center justify-between px-5">
        <Link href="/admin" aria-label="Admin overview">
          <BrandLockup brand={brand} subtitle="Admin panel" />
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

      <div className="mx-4 flex items-center gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2">
        <ShieldCheckIcon size={13} className="shrink-0 text-amber-300" />
        <p className="text-[9.5px] font-medium uppercase tracking-[0.13em] text-amber-200/90">
          {owner ? "Owner access · full control" : "Restricted admin access"}
        </p>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto px-4 pb-4">
        {GROUPS.map((group) => {
          const items = group.items.filter(
            (item) => !item.permission || hasPermission(user, item.permission),
          );
          if (items.length === 0) return null;
          return (
            <div key={group.label} className="mb-5">
              <p className="px-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">{group.label}</p>
              <nav className="mt-2 space-y-1" aria-label={group.label}>
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-link ${active ? "nav-link-active" : ""}`}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon size={17} className={active ? "text-brand-bright" : "text-muted"} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}

        <div className="mb-5">
          <p className="px-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">System</p>
          <nav className="mt-2 space-y-1" aria-label="System">
            {settingsVisible ? (
              <Link
                href="/admin/settings"
                className={`nav-link ${isActive(pathname, { href: "/admin/settings", label: "", icon: SettingsIcon }) ? "nav-link-active" : ""}`}
              >
                <SettingsIcon size={17} className="text-muted" />
                <span>Settings</span>
              </Link>
            ) : null}
            <Link
              href="/admin/change-password"
              className={`nav-link ${pathname === "/admin/change-password" ? "nav-link-active" : ""}`}
            >
              <KeyIcon size={17} className="text-muted" />
              <span>Password</span>
            </Link>
            <a href="/" target="_blank" rel="noreferrer" className="nav-link">
              <ExternalLinkIcon size={17} className="text-muted" />
              <span>View public site</span>
            </a>
          </nav>
        </div>

        <div className="rounded-xl border border-white/7 bg-white/[0.025] p-3">
          <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
            <DatabaseIcon size={10} /> Session
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-mist">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {emailVerified ? "Email verified" : "Email unverified"}
          </p>
        </div>
      </div>

      <div className="border-t border-white/8 p-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--brand-from),var(--brand-to))] text-[10px] font-bold text-white">
            {initials(user.username)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-snow">{user.username}</p>
            <p className="text-[9px] uppercase tracking-[0.12em] text-muted">
              {owner ? "Owner" : "Administrator"}
            </p>
          </div>
        </div>
        <LogoutButton className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11.5px] font-medium text-muted transition hover:bg-white/5 hover:text-snow" />
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
        <Link href="/admin" aria-label="Admin overview">
          <BrandLockup brand={brand} size={30} subtitle="Admin" />
        </Link>
        <Link
          href="/admin/settings"
          className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--brand-from),var(--brand-to))] text-[10px] font-bold text-white"
          aria-label="Settings"
        >
          {initials(user.username)}
        </Link>
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[282px] border-r border-white/8 bg-[#05070f]/90 backdrop-blur-2xl lg:block">
        {panel}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-black/75 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />
          <aside className="relative h-full w-[300px] animate-scale-in border-r border-white/10 bg-[#05070f] shadow-2xl">
            {panel}
          </aside>
        </div>
      ) : null}
    </>
  );
}
