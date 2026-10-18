"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeftIcon, MailIcon, SendIcon } from "@/components/ui/icons";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [working, setWorking] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      const data = await apiFetch<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: { email },
      });
      setSent(data.message);
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError
          ? requestError.message
          : "Could not send the reset email. Please try again.",
      );
    } finally {
      setWorking(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <Alert tone="success" title="Check your inbox">{sent}</Alert>
        <p className="text-xs leading-relaxed text-muted">
          The link expires in 60 minutes and can only be used once. If email delivery is not configured on this
          server, the owner can recover access with the documented server-side recovery command.
        </p>
        <Link href="/login" className="btn btn-secondary btn-block">
          <ArrowLeftIcon size={15} />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {error ? <Alert tone="danger" title="Request failed">{error}</Alert> : null}
      <div>
        <label htmlFor="email" className="field-label">
          <span>Email address</span>
        </label>
        <div className="relative">
          <MailIcon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input pl-10"
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        </div>
        <p className="form-hint">We&apos;ll email a single-use link if an account matches this address.</p>
      </div>
      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={working}>
        {working ? <Spinner size={16} /> : <SendIcon size={15} />}
        {working ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-center text-xs text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-brand-bright hover:text-white">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
