import Link from "next/link";
import { DEFAULT_BRAND } from "@/lib/brand";
import { BrandLockup } from "@/components/ui/logo";
import { ArrowLeftIcon, CloudIcon, LayoutIcon } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-16">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-[120px]" />
      <div className="relative w-full max-w-lg text-center">
        <BrandLockup brand={DEFAULT_BRAND} subtitle="Staff portal" className="mb-10 justify-center" />
        <div className="relative mx-auto mb-8 grid h-28 w-28 place-items-center">
          <div className="absolute inset-0 animate-float rounded-[32px] border border-white/10 bg-white/[0.04] backdrop-blur-xl" />
          <CloudIcon size={44} className="relative text-brand-bright" />
          <span className="absolute -right-2 -top-2 rounded-full border border-white/10 bg-deep px-2 py-0.5 font-mono text-[10px] text-mist">
            404
          </span>
        </div>
        <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-brand-bright">
          Lost above the clouds
        </p>
        <h1 className="font-display text-3xl font-semibold text-snow sm:text-4xl">This page drifted away.</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-mist">
          The link may be old, mistyped, or the page may have moved. Your applications are safe — let&apos;s get you back on track.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
          <Link href="/" className="btn btn-primary">
            <ArrowLeftIcon size={16} />
            Back to home
          </Link>
          <Link href="/dashboard" className="btn btn-secondary">
            <LayoutIcon size={16} />
            My dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
