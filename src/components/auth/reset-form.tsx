"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRightIcon, CheckCircleIcon } from "@/components/ui/icons";
import { FieldError } from "@/components/ui/field-error";

export function ResetForm({ token }: { token?: string }) {
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [working, setWorking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="space-y-5">
        <Alert tone="danger" title="Invalid reset link">
          This page needs a valid reset token. Request a fresh link from the forgot-password page.
        </Alert>
        <Link href="/forgot-password" className="btn btn-primary btn-block">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300 [animation:checkPop_.5s_ease]">
          <CheckCircleIcon size={28} />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-snow">Password updated</h2>
          <p className="mt-2 text-sm leading-relaxed text-mist">
            Every existing session has been signed out. Use your new password to sign back in.
          </p>
        </div>
        <Link href="/login" className="btn btn-primary btn-block">
          Continue to sign in
          <ArrowRightIcon size={15} />
        </Link>
      </div>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;
    setFormError(null);
    setFields({});
    setConfirmError(null);
    if (form.password !== form.confirm) {
      setConfirmError("Passwords do not match.");
      return;
    }
    setWorking(true);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: { token, password: form.password },
      });
      setDone(true);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFormError(error.message);
        setFields(error.fields);
      } else {
        setFormError("Could not reset your password. Please request a new link.");
      }
      setWorking(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {formError ? <Alert tone="danger" title="Reset failed">{formError}</Alert> : null}
      <PasswordInput
        label="New password"
        name="password"
        value={form.password}
        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
        placeholder="At least 8 characters"
        autoComplete="new-password"
        error={fields.password}
        hint="At least 8 characters with a letter and a number."
        required
      />
      <PasswordInput
        label="Confirm new password"
        name="confirm"
        value={form.confirm}
        onChange={(event) => setForm((current) => ({ ...current, confirm: event.target.value }))}
        placeholder="Repeat your new password"
        autoComplete="new-password"
        error={confirmError ?? undefined}
        required
      />
      <FieldError message={fields.token} />
      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={working}>
        {working ? <Spinner size={16} /> : null}
        {working ? "Updating…" : "Set new password"}
      </button>
      <p className="text-center text-xs text-muted">
        <Link href="/login" className="font-medium text-brand-bright hover:text-white">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
