"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRightIcon, MailIcon, UserIcon } from "@/components/ui/icons";
import { FieldError } from "@/components/ui/field-error";

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [working, setWorking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
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
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: { username: form.username, email: form.email, password: form.password },
      });
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/admin")
        ? next
        : "/dashboard";
      router.replace(safeNext);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFormError(error.message);
        setFields(error.fields);
      } else {
        setFormError("Could not create your account. Please try again.");
      }
      setWorking(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {formError ? <Alert tone="danger" title="Could not create account">{formError}</Alert> : null}

      <div>
        <label htmlFor="username" className="field-label">
          <span>Username</span>
          <span className="text-[10px] font-normal text-muted">3–24 characters</span>
        </label>
        <div className="relative">
          <UserIcon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="username"
            name="username"
            value={form.username}
            onChange={(event) => update("username", event.target.value)}
            className={`input pl-10 ${fields.username ? "input-error" : ""}`}
            placeholder="starling"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={24}
            required
            aria-invalid={Boolean(fields.username)}
          />
        </div>
        <FieldError message={fields.username} />
      </div>

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
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            className={`input pl-10 ${fields.email ? "input-error" : ""}`}
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            aria-invalid={Boolean(fields.email)}
          />
        </div>
        <FieldError message={fields.email} />
        <p className="form-hint">Used for verification, password recovery, and application updates.</p>
      </div>

      <PasswordInput
        label="Password"
        name="password"
        value={form.password}
        onChange={(event) => update("password", event.target.value)}
        placeholder="At least 8 characters"
        autoComplete="new-password"
        error={fields.password}
        hint="At least 8 characters with a letter and a number. Hashed with Argon2id."
        required
      />

      <PasswordInput
        label="Confirm password"
        name="confirm"
        value={form.confirm}
        onChange={(event) => update("confirm", event.target.value)}
        placeholder="Repeat your password"
        autoComplete="new-password"
        error={confirmError ?? undefined}
        required
      />

      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={working}>
        {working ? <Spinner size={16} /> : null}
        {working ? "Creating your account…" : "Create member account"}
        {!working ? <ArrowRightIcon size={16} /> : null}
      </button>

      <p className="rounded-xl border border-white/7 bg-white/[0.025] px-3.5 py-3 text-[11px] leading-relaxed text-muted">
        Registration always creates a <span className="font-medium text-mist">member</span> account. It never grants
        admin or owner access. You can apply for staff immediately after signing in.
      </p>

      <p className="text-center text-xs text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-bright hover:text-white">
          Sign in
        </Link>
      </p>
    </form>
  );
}
