"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRightIcon, UserIcon } from "@/components/ui/icons";
import { FieldError } from "@/components/ui/field-error";

type LoginResponse = {
  user: { id: string; username: string; role: string; mustChangePassword: boolean };
  redirect: string;
};

export function LoginForm({
  admin = false,
  next,
  notice,
}: {
  admin?: boolean;
  next?: string;
  notice?: string;
}) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;
    setWorking(true);
    setFormError(null);
    setFields({});
    try {
      const data = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: { identifier, password, admin, next },
      });
      router.replace(data.redirect);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFormError(error.message);
        setFields(error.fields);
      } else {
        setFormError("Could not sign in. Please try again.");
      }
      setWorking(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {notice ? <Alert tone="warning">{notice}</Alert> : null}
      {formError ? <Alert tone="danger" title="Sign-in failed">{formError}</Alert> : null}

      <div>
        <label htmlFor="identifier" className="field-label">
          <span>Username or email</span>
        </label>
        <div className="relative">
          <UserIcon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="identifier"
            name="identifier"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className={`input pl-10 ${fields.identifier ? "input-error" : ""}`}
            placeholder="nova or you@example.com"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            aria-invalid={Boolean(fields.identifier)}
          />
        </div>
        <FieldError message={fields.identifier} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="password" className="text-[13px] font-medium text-snow/90">
            Password
          </label>
          <Link href="/forgot-password" className="text-[11.5px] font-medium text-brand-bright hover:text-white">
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          name="password"
          label=""
          hideLabel
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Your password"
          autoComplete="current-password"
          error={fields.password}
          required
        />
      </div>

      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={working}>
        {working ? <Spinner size={16} /> : null}
        {working ? "Signing in…" : admin ? "Enter the admin panel" : "Sign in to Top Cloud"}
        {!working ? <ArrowRightIcon size={16} /> : null}
      </button>

      <p className="text-center text-xs text-muted">
        {admin ? (
          <>
            Not an administrator?{" "}
            <Link href="/login" className="font-medium text-brand-bright hover:text-white">
              Use member sign-in
            </Link>
          </>
        ) : (
          <>
            New to Top Cloud?{" "}
            <Link href="/register" className="font-medium text-brand-bright hover:text-white">
              Create a member account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
