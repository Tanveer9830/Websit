"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRightIcon, CheckCircleIcon, MailIcon } from "@/components/ui/icons";

export function VerifyPanel({ token, signedIn }: { token?: string; signedIn: boolean }) {
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    if (!token || working) return;
    setWorking(true);
    setError(null);
    try {
      await apiFetch("/api/auth/verify-email", { method: "POST", body: { token } });
      setDone(true);
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError
          ? requestError.message
          : "Could not verify this link. Please request a new one from your dashboard.",
      );
    } finally {
      setWorking(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-5">
        <Alert tone="danger" title="Verification link missing">
          Open the full link from your verification email. Links expire after 24 hours.
        </Alert>
        <Link href={signedIn ? "/dashboard" : "/login"} className="btn btn-primary btn-block">
          {signedIn ? "Back to dashboard" : "Sign in"}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300 [animation:checkPop_.5s_ease]">
          <CheckCircleIcon size={30} />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-snow">Email verified</h2>
          <p className="mt-2 text-sm leading-relaxed text-mist">
            You&apos;re all set. Your member account is confirmed and ready for applications.
          </p>
        </div>
        <Link href={signedIn ? "/dashboard" : "/login"} className="btn btn-primary btn-block">
          {signedIn ? "Open my dashboard" : "Sign in"}
          <ArrowRightIcon size={15} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger" title="Verification failed">{error}</Alert> : null}
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand-bright">
            <MailIcon size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-snow">Confirm this email address</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              This link can be used once and expires 24 hours after it was requested. Verification confirms you own
              the address on your account.
            </p>
          </div>
        </div>
      </div>
      <button type="button" onClick={verify} className="btn btn-primary btn-block btn-lg" disabled={working}>
        {working ? <Spinner size={16} /> : <CheckCircleIcon size={16} />}
        {working ? "Verifying…" : "Verify my email"}
      </button>
      <p className="text-center text-xs text-muted">
        <Link href={signedIn ? "/profile" : "/login"} className="font-medium text-brand-bright hover:text-white">
          {signedIn ? "Go to profile" : "Back to sign in"}
        </Link>
      </p>
    </div>
  );
}
