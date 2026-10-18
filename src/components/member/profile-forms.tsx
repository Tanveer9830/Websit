"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { PasswordInput } from "@/components/ui/password-input";
import { FieldError } from "@/components/ui/field-error";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  CheckCircleIcon,
  KeyIcon,
  LockIcon,
  MailIcon,
  RefreshIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@/components/ui/icons";

type ProfileResponse = {
  user: { id: string; username: string; email: string; emailVerified: boolean };
  message: string;
};

type PasswordResponse = {
  ok: boolean;
  message: string;
  redirect: string | null;
};

export function ProfileForms({
  user,
}: {
  user: { id: string; username: string; email: string; emailVerified: boolean; role: string };
}) {
  const router = useRouter();
  const toast = useToast();

  const [identity, setIdentity] = useState({ username: user.username, email: user.email, currentPassword: "" });
  const [identityErrors, setIdentityErrors] = useState<Record<string, string>>({});
  const [identityMessage, setIdentityMessage] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [savingIdentity, setSavingIdentity] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const emailChanged = identity.email.trim().toLowerCase() !== user.email.toLowerCase();

  async function saveIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingIdentity) return;
    setSavingIdentity(true);
    setIdentityError(null);
    setIdentityMessage(null);
    setIdentityErrors({});
    try {
      const data = await apiFetch<ProfileResponse>("/api/account/profile", {
        method: "PATCH",
        body: {
          username: identity.username,
          email: identity.email,
          ...(emailChanged ? { currentPassword: identity.currentPassword } : {}),
        },
      });
      setIdentityMessage(data.message);
      setIdentity((current) => ({ ...current, currentPassword: "" }));
      setIdentityErrors({});
      toast.push({ title: "Profile saved", description: data.message, tone: "success" });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setIdentityError(error.message);
        setIdentityErrors(error.fields);
      } else {
        setIdentityError("Could not save your profile. Please try again.");
      }
    } finally {
      setSavingIdentity(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingPassword) return;
    setPasswordErrors({});
    setPasswordError(null);
    setPasswordMessage(null);
    if (passwords.newPassword !== passwords.confirm) {
      setPasswordErrors({ confirm: "Passwords do not match." });
      return;
    }
    setSavingPassword(true);
    try {
      const data = await apiFetch<PasswordResponse>("/api/account/password", {
        method: "POST",
        body: { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword },
      });
      setPasswordMessage(data.message);
      setPasswords({ currentPassword: "", newPassword: "", confirm: "" });
      toast.push({ title: "Password updated", description: "All other sessions were signed out.", tone: "success" });
      if (data.redirect) {
        router.push(data.redirect);
      } else {
        router.refresh();
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        setPasswordError(error.message);
        setPasswordErrors(error.fields);
      } else {
        setPasswordError("Could not update your password. Please try again.");
      }
    } finally {
      setSavingPassword(false);
    }
  }

  async function revokeSessions() {
    if (revoking) return;
    setRevoking(true);
    try {
      const data = await apiFetch<{ message: string }>("/api/account/sessions/revoke-all", {
        method: "POST",
      });
      toast.push({ title: "Sessions signed out", description: data.message, tone: "success" });
    } catch (error) {
      toast.push({
        title: "Could not sign out sessions",
        description: error instanceof Error ? error.message : "Please try again.",
        tone: "error",
      });
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr] lg:items-start">
      <div className="space-y-5">
        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-brand/20 bg-brand/10 text-brand-bright">
              <UserIcon size={16} />
            </span>
            <div>
              <h2 className="font-display text-[15px] font-semibold text-snow">Account details</h2>
              <p className="text-[10.5px] text-muted">Your username is how reviewers see you.</p>
            </div>
          </div>

          <form onSubmit={saveIdentity} className="mt-5 space-y-4" noValidate>
            {identityError ? <Alert tone="danger" title="Could not save">{identityError}</Alert> : null}
            {identityMessage ? <Alert tone="success">{identityMessage}</Alert> : null}

            <div>
              <label htmlFor="username" className="field-label">
                <span>Username</span>
              </label>
              <div className="relative">
                <UserIcon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  id="username"
                  name="username"
                  value={identity.username}
                  onChange={(event) => setIdentity((current) => ({ ...current, username: event.target.value }))}
                  className={`input pl-10 ${identityErrors.username ? "input-error" : ""}`}
                  autoComplete="username"
                  minLength={3}
                  maxLength={24}
                  required
                />
              </div>
              <FieldError message={identityErrors.username} />
            </div>

            <div>
              <label htmlFor="email" className="field-label">
                <span>Email address</span>
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-medium text-emerald-300">
                    <ShieldCheckIcon size={10} /> Verified
                  </span>
                ) : (
                  <span className="text-[9.5px] font-medium text-amber-300">Not verified</span>
                )}
              </label>
              <div className="relative">
                <MailIcon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={identity.email}
                  onChange={(event) => setIdentity((current) => ({ ...current, email: event.target.value }))}
                  className={`input pl-10 ${identityErrors.email ? "input-error" : ""}`}
                  autoComplete="email"
                  required
                />
              </div>
              <FieldError message={identityErrors.email} />
            </div>

            {emailChanged ? (
              <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-4">
                <PasswordInput
                  label="Current password"
                  name="currentPassword"
                  value={identity.currentPassword}
                  onChange={(event) =>
                    setIdentity((current) => ({ ...current, currentPassword: event.target.value }))
                  }
                  placeholder="Required to change your email"
                  autoComplete="current-password"
                  error={identityErrors.currentPassword}
                  hint="Changing your email marks it unverified and sends a fresh confirmation link."
                  required
                />
              </div>
            ) : null}

            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary btn-sm" disabled={savingIdentity}>
                {savingIdentity ? <Spinner size={14} /> : <CheckCircleIcon size={14} />}
                {savingIdentity ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
              <KeyIcon size={16} />
            </span>
            <div>
              <h2 className="font-display text-[15px] font-semibold text-snow">Password</h2>
              <p className="text-[10.5px] text-muted">
                Stored as an Argon2id hash. Changing it signs out other devices.
              </p>
            </div>
          </div>

          <form onSubmit={savePassword} className="mt-5 space-y-4" noValidate>
            {passwordError ? <Alert tone="danger" title="Could not update password">{passwordError}</Alert> : null}
            {passwordMessage ? <Alert tone="success">{passwordMessage}</Alert> : null}

            <PasswordInput
              label="Current password"
              name="currentPassword"
              value={passwords.currentPassword}
              onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))}
              placeholder="Your current password"
              autoComplete="current-password"
              error={passwordErrors.currentPassword}
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <PasswordInput
                label="New password"
                name="newPassword"
                value={passwords.newPassword}
                onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                error={passwordErrors.newPassword}
                required
              />
              <PasswordInput
                label="Confirm new password"
                name="confirm"
                value={passwords.confirm}
                onChange={(event) => setPasswords((current) => ({ ...current, confirm: event.target.value }))}
                placeholder="Repeat it"
                autoComplete="new-password"
                error={passwordErrors.confirm}
                required
              />
            </div>
            <p className="text-[10px] leading-relaxed text-muted">
              At least 8 characters, with one letter and one number. Common passwords are rejected.
            </p>
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary btn-sm" disabled={savingPassword}>
                {savingPassword ? <Spinner size={14} /> : <LockIcon size={14} />}
                {savingPassword ? "Updating…" : "Update password"}
              </button>
            </div>
          </form>
        </section>
      </div>

      <div className="space-y-5">
        <section className="card p-5">
          <h2 className="font-display text-[14px] font-semibold text-snow">Security</h2>
          <ul className="mt-4 space-y-3.5">
            {[
              {
                icon: <ShieldCheckIcon size={14} className="text-emerald-300" />,
                title: "Server-side sessions",
                body: "Opaque tokens in HttpOnly cookies. No account data is stored in the browser.",
              },
              {
                icon: <LockIcon size={14} className="text-brand-bright" />,
                title: "Argon2id hashing",
                body: "Passwords are never stored or logged in plain text.",
              },
              {
                icon: <MailIcon size={14} className="text-cyan-300" />,
                title: "Verified contact",
                body: user.emailVerified
                  ? "Your email is verified for recovery and updates."
                  : "Verify your email to unlock recovery and optional application updates.",
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-2.5">
                <span className="mt-0.5 shrink-0">{item.icon}</span>
                <div>
                  <p className="text-[11.5px] font-medium text-mist">{item.title}</p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={revokeSessions}
            disabled={revoking}
            className="btn btn-secondary btn-sm mt-5 w-full"
          >
            {revoking ? <Spinner size={14} /> : <RefreshIcon size={14} />}
            {revoking ? "Signing out…" : "Sign out all other sessions"}
          </button>
        </section>

        <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted">Member ID</p>
          <p className="mt-1.5 break-all font-mono text-[10.5px] leading-relaxed text-mist">{user.id}</p>
          <p className="mt-3 text-[10px] leading-relaxed text-muted">
            Permanent and unique. Reference this in any support request about your account.
          </p>
        </section>

        <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted">Role</p>
          <p className="mt-1 text-[13px] font-semibold text-snow">{user.role === "MEMBER" ? "Member" : "Administrator"}</p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
            Roles are managed by the owner only. Members can never grant themselves elevated access.
          </p>
        </section>
      </div>
    </div>
  );
}
