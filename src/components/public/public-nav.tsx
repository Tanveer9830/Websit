"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Brand } from "@/lib/brand";
import { BrandLockup } from "@/components/ui/logo";
import { ArrowRightIcon, LayoutIcon, MenuIcon, ShieldCheckIcon, XIcon } from "@/components/ui/icons";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#roles", label: "Teams" },
  { href: "#security", label: "Security" },
  { href: "#faq", label: "FAQ" },
];

export function PublicNav({
  brand,
  signedIn,
  panelAccess,
}: {
  brand: Brand;
  signedIn: boolean;
  panelAccess: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-white/8 bg-night/80 backdrop-blur-2xl" : "bg-transparent"
      }`}
    >
      <div className="container-tc flex h-[72px] items-center justify-between gap-4">
        <Link href="/" aria-label={`${brand.name} home`} className="shrink-0">
          <BrandLockup brand={brand} subtitle="Staff" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-mist transition hover:bg-white/[0.04] hover:text-snow"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          {signedIn ? (
            <>
              {panelAccess ? (
                <Link href="/admin" className="btn btn-ghost btn-sm">
                  <ShieldCheckIcon size={15} />
                  Admin panel
                </Link>
              ) : null}
              <Link href="/dashboard" className="btn btn-primary btn-sm">
                <LayoutIcon size={15} />
                My dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm">
                Apply for staff
                <ArrowRightIcon size={15} />
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-snow md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <XIcon size={18} /> : <MenuIcon size={19} />}
        </button>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-white/8 bg-night/95 px-5 pb-6 pt-3 backdrop-blur-2xl md:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-mist hover:bg-white/5 hover:text-snow"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2.5 border-t border-white/8 pt-4">
            {signedIn ? (
              <>
                <Link href="/dashboard" className="btn btn-primary btn-block" onClick={() => setOpen(false)}>
                  My dashboard
                </Link>
                {panelAccess ? (
                  <Link href="/admin" className="btn btn-secondary btn-block" onClick={() => setOpen(false)}>
                    Admin panel
                  </Link>
                ) : null}
              </>
            ) : (
              <>
                <Link href="/register" className="btn btn-primary btn-block" onClick={() => setOpen(false)}>
                  Apply for staff
                  <ArrowRightIcon size={15} />
                </Link>
                <Link href="/login" className="btn btn-secondary btn-block" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
