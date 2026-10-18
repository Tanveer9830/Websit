"use client";

import Link from "next/link";
import { AlertTriangleIcon, ArrowLeftIcon, RefreshIcon } from "@/components/ui/icons";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-rose-400/20 bg-rose-400/[0.07] text-rose-300">
          <AlertTriangleIcon size={28} />
        </div>
        <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-rose-300">Something went wrong</p>
        <h1 className="font-display text-3xl font-semibold text-snow">A cloud passed in front of us.</h1>
        <p className="mt-3 text-sm leading-relaxed text-mist">
          An unexpected error interrupted that request. Your data is unchanged. Try again — if it keeps happening, contact the team.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
          <button type="button" onClick={reset} className="btn btn-primary">
            <RefreshIcon size={16} />
            Try again
          </button>
          <Link href="/" className="btn btn-secondary">
            <ArrowLeftIcon size={16} />
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
