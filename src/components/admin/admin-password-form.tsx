"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { ArrowRightIcon, KeyIcon, LockIcon, ShieldCheckIcon } from "@/components/ui/icons";

export function AdminPasswordForm({
  forced,
  isOwner,
}: {
  forced: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(null);
    setErrors({});
    if (form.newPassword !== form.confirm) {
      setErrors({ confirm: "Passwords do not match." });
      return;
    }
    if (form.newPassword.length < (isOwner ? 10 : 8)) {
      setErrors({ newPassword: `Use at least ${isOwner ? 10 : 8} characters.` });
      return;
    }
    setSaving(true);
    try {
      const data = await apiFetch<{ message: string; redirect: string | null }>(
        "/api/account/password",
        {
          method: "POST",
          body: { currentPassword: form.currentPassword, newPassword: form.newPassword },
        },
      );
      toast.push({
        title: "Password updated",
        description: forced ? "Temporary password replaced. The panel is now unlocked." : data.message,
        tone: "success",
      });
      router.replace(data.redirect ?? "/admin");
      router.refresh();
    } catch (requestError) {
      if (requestError instanceof ApiClientError) {
        setError(requestError.message);
        setErrors(requestError.fields);
      } else {
        setError("Could not update your password. Please try again.");
      }
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {error ? <Alert tone="danger" title="Password not changed">{error}</Alert> : null}

      <PasswordInput
        label="Current password"
        name="currentPassword"
        value={form.currentPassword}
        onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
        placeholder={forced ? "Your temporary password" : "Your current password"}
        autoComplete="current-password"
        error={errors.currentPassword}
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordInput
          label="New password"
          name="newPassword"
          value={form.newPassword}
          onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
          placeholder={`At least ${isOwner ? 10 : 8} characters`}
          autoComplete="new-password"
          error={errors.newPassword}
          hint="Include a letter and a number. Common passwords are rejected."
          required
        />
        <PasswordInput
          label="Confirm new password"
          name="confirm"
          value={form.confirm}
          onChange={(event) => setForm({ ...form, confirm: event.target.value })}
          placeholder="Repeat your new password"
          autoComplete="new-password"
          error={errors.confirm}
          required
        />
      </div>

      <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
        <ul className="space-y-2 text-[10px] leading-relaxed text-muted">
          <li className="flex items-start gap-2">
            <ShieldCheckIcon size={12} className="mt-0.5 shrink-0 text-emerald-300" />
            Passwords are hashed with Argon2id. Nobody — including the owner — can read them.
          </li>
          <li className="flex items-start gap-2">
            <LockIcon size={12} className="mt-0.5 shrink-0 text-brand-bright" />
            All other sessions are signed out as soon as the password changes.
          </li>
          <li className="flex items-start gap-2">
            <KeyIcon size={12} className="mt-0.5 shrink-0 text-amber-200" />
            {isOwner
              ? "Owner passwords need at least 10 characters. The temporary default cannot be reused."
              : "Administrator passwords need at least 8 characters, including a letter and a number."}
          </li>
        </ul>
      </div>

      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={saving}>
        {saving ? <Spinner size={16} /> : <LockIcon size={16} />}
        {saving ? "Updating password…" : "Set new password"}
        {!saving ? <ArrowRightIcon size={15} /> : null}
      </button>
    </form>
  );
}
