"use client";

import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import type { PanelSettings } from "@/lib/settings";
import { AUDIT_ACTION_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { ALL_PERMISSIONS, PERMISSIONS, parsePermissions } from "@/lib/permissions";
import { Alert } from "@/components/ui/alert";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError } from "@/components/ui/field-error";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { BrandLockup } from "@/components/ui/logo";
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DatabaseIcon,
  EyeIcon,
  KeyIcon,
  LayersIcon,
  LockIcon,
  MailIcon,
  PaletteIcon,
  PlusIcon,
  RefreshIcon,
  SaveIcon,
  ShieldCheckIcon,
  SlidersIcon,
  TrashIcon,
  UserIcon,
} from "@/components/ui/icons";

type Tab = "branding" | "application" | "account" | "audit";

type AuditLog = {
  id: string;
  action: string;
  actor: string;
  targetType: string | null;
  targetId: string | null;
  metadata: string | null;
  createdAt: string;
};

type Props = {
  settings: PanelSettings;
  user: { id: string; username: string; email: string; role: string; emailVerified: boolean; permissions: string };
  isOwner: boolean;
  canManageSettings: boolean;
  canViewAudit: boolean;
  initialTab: Tab;
  audit: {
    logs: AuditLog[];
    page: number;
    pages: number;
    total: number;
    pageSize: number;
  } | null;
};

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "branding", label: "Branding", icon: <PaletteIcon size={14} /> },
  { id: "application", label: "Applications", icon: <SlidersIcon size={14} /> },
  { id: "account", label: "Account & security", icon: <UserIcon size={14} /> },
  { id: "audit", label: "Audit log", icon: <DatabaseIcon size={14} /> },
];

export function SettingsTabs(props: Props) {
  const allowed = TABS.filter(
    (tab) =>
      (tab.id !== "branding" && tab.id !== "application" ? true : props.canManageSettings) &&
      (tab.id !== "audit" || props.canViewAudit),
  );
  const initial = allowed.some((tab) => tab.id === props.initialTab) ? props.initialTab : "account";
  const [tab, setTab] = useState<Tab>(initial);

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:items-start">
      <nav
        className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.025] p-2 lg:flex-col lg:overflow-visible"
        aria-label="Settings sections"
      >
        {allowed.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-[11.5px] font-medium transition ${
              tab === item.id
                ? "bg-brand/15 text-brand-bright"
                : "text-muted hover:bg-white/5 hover:text-snow"
            }`}
            aria-current={tab === item.id ? "page" : undefined}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0">
        {tab === "branding" && props.canManageSettings ? (
          <BrandingPanel settings={props.settings} isOwner={props.isOwner} />
        ) : null}
        {tab === "application" && props.canManageSettings ? <ApplicationPanel settings={props.settings} /> : null}
        {tab === "account" ? <AccountPanel user={props.user} isOwner={props.isOwner} /> : null}
        {tab === "audit" && props.canViewAudit && props.audit ? (
          <AuditPanel audit={props.audit} />
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Branding */

function BrandingPanel({ settings, isOwner }: { settings: PanelSettings; isOwner: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    brandName: settings.brandName,
    tagline: settings.tagline,
    description: settings.description,
    logoUrl: settings.logoUrl,
    supportEmail: settings.supportEmail,
    footerNote: settings.footerNote,
    accentFrom: settings.accentFrom,
    accentTo: settings.accentTo,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const previewBrand = {
    name: form.brandName || "Top Cloud",
    logoUrl: form.logoUrl,
    accentFrom: form.accentFrom,
    accentTo: form.accentTo,
    tagline: form.tagline,
    supportEmail: form.supportEmail,
  };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setErrors({});
    try {
      await apiFetch("/api/admin/settings", { method: "PATCH", body: form });
      toast.push({
        title: "Branding saved",
        description: "The public site, auth pages and dashboards now use these values.",
        tone: "success",
      });
      router.refresh();
    } catch (requestError) {
      if (requestError instanceof ApiClientError) {
        setError(requestError.message);
        setErrors(requestError.fields);
      } else {
        setError("Could not save branding.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <PaletteIcon size={16} className="text-brand-bright" />
          <div>
            <h2 className="font-display text-[15px] font-semibold text-snow">Identity</h2>
            <p className="text-[10.5px] text-muted">Shown across the public site, auth pages and every dashboard.</p>
          </div>
        </div>

        {error ? <div className="mt-4"><Alert tone="danger">{error}</Alert></div> : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="brandName" className="field-label"><span>Panel name</span></label>
            <input
              id="brandName"
              className={`input ${errors.brandName ? "input-error" : ""}`}
              value={form.brandName}
              onChange={(event) => setForm({ ...form, brandName: event.target.value })}
              maxLength={40}
              required
            />
            {errors.brandName ? <p className="form-error">{errors.brandName}</p> : null}
          </div>
          <div>
            <label htmlFor="supportEmail" className="field-label"><span>Support email</span></label>
            <input
              id="supportEmail"
              type="email"
              className={`input ${errors.supportEmail ? "input-error" : ""}`}
              value={form.supportEmail}
              onChange={(event) => setForm({ ...form, supportEmail: event.target.value })}
              maxLength={254}
              required
            />
            {errors.supportEmail ? <p className="form-error">{errors.supportEmail}</p> : null}
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="tagline" className="field-label">
            <span>Tagline</span>
            <span className="text-[9.5px] font-normal text-muted">{form.tagline.length}/120</span>
          </label>
          <input
            id="tagline"
            className="input"
            value={form.tagline}
            onChange={(event) => setForm({ ...form, tagline: event.target.value })}
            maxLength={120}
          />
          {errors.tagline ? <p className="form-error">{errors.tagline}</p> : null}
        </div>

        <div className="mt-4">
          <label htmlFor="description" className="field-label">
            <span>Description</span>
            <span className="text-[9.5px] font-normal text-muted">{form.description.length}/400</span>
          </label>
          <textarea
            id="description"
            className="textarea min-h-[84px]"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            maxLength={400}
          />
          <p className="form-hint">Used in metadata and the landing page. Keep it factual.</p>
        </div>

        <div className="mt-4">
          <label htmlFor="logoUrl" className="field-label">
            <span>Logo URL</span>
            <span className="text-[9.5px] font-normal text-muted">Optional</span>
          </label>
          <input
            id="logoUrl"
            className={`input ${errors.logoUrl ? "input-error" : ""}`}
            value={form.logoUrl}
            onChange={(event) => setForm({ ...form, logoUrl: event.target.value })}
            placeholder="https://cdn.example.com/logo.png or /logo.svg"
            maxLength={500}
          />
          {errors.logoUrl ? <p className="form-error">{errors.logoUrl}</p> : null}
          <p className="form-hint">Leave empty to use the built-in gradient cloud mark. HTTPS or a local path only.</p>
        </div>

        <div className="mt-4">
          <label htmlFor="footerNote" className="field-label"><span>Footer note</span></label>
          <input
            id="footerNote"
            className="input"
            value={form.footerNote}
            onChange={(event) => setForm({ ...form, footerNote: event.target.value })}
            maxLength={160}
          />
          {errors.footerNote ? <p className="form-error">{errors.footerNote}</p> : null}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-[15px] font-semibold text-snow">Accent colours</h2>
        <p className="mt-1 text-[10.5px] text-muted">
          A two-stop gradient drives buttons, highlights and the logo fallback. Use 6-digit hex.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[
            { key: "accentFrom" as const, label: "Gradient start" },
            { key: "accentTo" as const, label: "Gradient end" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label htmlFor={key} className="field-label"><span>{label}</span></label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form[key]}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                  className="h-[42px] w-12 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
                  aria-label={`${label} colour picker`}
                />
                <input
                  id={key}
                  className={`input font-mono text-[12px] ${errors[key] ? "input-error" : ""}`}
                  value={form[key]}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                  maxLength={7}
                />
              </div>
              {errors[key] ? <p className="form-error">{errors[key]}</p> : null}
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {[
            ["#8b5cf6", "#3b82f6"],
            ["#22d3ee", "#3b82f6"],
            ["#f472b6", "#8b5cf6"],
            ["#34d399", "#22d3ee"],
            ["#f59e0b", "#ef4444"],
          ].map(([from, to]) => (
            <button
              key={`${from}-${to}`}
              type="button"
              onClick={() => setForm({ ...form, accentFrom: from!, accentTo: to! })}
              className="h-8 w-14 rounded-lg border border-white/10 transition hover:scale-105"
              style={{ background: `linear-gradient(120deg, ${from}, ${to})` }}
              aria-label={`Use gradient ${from} to ${to}`}
            />
          ))}
          <span className="text-[9.5px] text-muted">Presets</span>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-white/8 px-5 py-3">
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.15em] text-muted">Live preview</p>
        </div>
        <div
          className="flex flex-wrap items-center justify-between gap-4 bg-[#060a16] px-5 py-6"
          style={{ "--brand-from": form.accentFrom, "--brand-to": form.accentTo } as CSSProperties}
        >
          <div className="flex items-center gap-3">
            <BrandLockup brand={previewBrand} subtitle="Staff portal" />
            <span className="hidden text-[10px] text-muted sm:inline">· preview</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] text-mist">Process</span>
            <span className="rounded-lg bg-[linear-gradient(120deg,var(--brand-from),var(--brand-to))] px-3 py-1.5 text-[10px] font-semibold text-white">
              Apply now
            </span>
          </div>
        </div>
        <p className="border-t border-white/8 px-5 py-3 text-[10px] text-muted">
          The accent gradient applies globally on the next refresh. Logo URL falls back to the gradient mark if it fails
          to load.
        </p>
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] text-muted">
          {isOwner ? "Owner changes are audited." : "Changes are audited with your admin identity."}
        </p>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <Spinner size={15} /> : <SaveIcon size={15} />}
          {saving ? "Saving…" : "Save branding"}
        </button>
      </div>
    </form>
  );
}

/* --------------------------------------------------------------- Application */

function Toggle({
  checked,
  onChange,
  label,
  description,
  icon,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.02] p-3.5 transition hover:border-white/12">
      <span className="flex gap-2.5">
        {icon ? <span className="mt-0.5 text-brand-bright">{icon}</span> : null}
        <span>
          <span className="block text-[11.5px] font-medium text-snow">{label}</span>
          <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">{description}</span>
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${
          checked ? "bg-brand" : "bg-white/12"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function ApplicationPanel({ settings }: { settings: PanelSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    applicationsOpen: settings.applicationsOpen,
    positionsEnabled: settings.positionsEnabled,
    positions: settings.positions,
    collectDiscord: settings.collectDiscord,
    allowMultiple: settings.allowMultiple,
    requireVerifiedEmail: settings.requireVerifiedEmail,
    notifyStatusEmail: settings.notifyStatusEmail,
  });
  const [positionDraft, setPositionDraft] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function addPosition() {
    const clean = positionDraft.trim();
    if (!clean) return;
    if (form.positions.some((position) => position.toLowerCase() === clean.toLowerCase())) {
      setPositionDraft("");
      return;
    }
    setForm({ ...form, positions: [...form.positions, clean].slice(0, 20) });
    setPositionDraft("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (form.positionsEnabled && form.positions.length === 0) {
      setErrors({ positions: "Add at least one position, or turn positions off." });
      return;
    }
    setSaving(true);
    setError(null);
    setErrors({});
    try {
      await apiFetch("/api/admin/settings", { method: "PATCH", body: form });
      toast.push({ title: "Application settings saved", tone: "success" });
      router.refresh();
    } catch (requestError) {
      if (requestError instanceof ApiClientError) {
        setError(requestError.message);
        setErrors(requestError.fields);
      } else {
        setError("Could not save application settings.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <SlidersIcon size={16} className="text-brand-bright" />
          <div>
            <h2 className="font-display text-[15px] font-semibold text-snow">Application availability</h2>
            <p className="text-[10.5px] text-muted">Controls the live member experience immediately.</p>
          </div>
        </div>

        {error ? <div className="mt-4"><Alert tone="danger">{error}</Alert></div> : null}

        <div className="mt-4 space-y-2.5">
          <Toggle
            checked={form.applicationsOpen}
            onChange={(value) => setForm({ ...form, applicationsOpen: value })}
            label="Applications are open"
            description="When off, members see a branded paused state and the submit API rejects new applications."
            icon={<LockIcon size={14} />}
          />
          <Toggle
            checked={form.positionsEnabled}
            onChange={(value) => setForm({ ...form, positionsEnabled: value })}
            label="Ask members to choose a team"
            description="Shows a required position selector on the intro step and records it on the application."
            icon={<LayersIcon size={14} />}
          />
          <Toggle
            checked={form.collectDiscord}
            onChange={(value) => setForm({ ...form, collectDiscord: value })}
            label="Collect Discord details"
            description="Adds optional Discord username and numeric user ID fields (searchable by admins)."
            icon={<UserIcon size={14} />}
          />
          <Toggle
            checked={form.allowMultiple}
            onChange={(value) => setForm({ ...form, allowMultiple: value })}
            label="Allow multiple active applications"
            description="When off, a member with a pending, reviewing, considering, approved or on-hold application cannot submit another."
            icon={<RefreshIcon size={14} />}
          />
          <Toggle
            checked={form.requireVerifiedEmail}
            onChange={(value) => setForm({ ...form, requireVerifiedEmail: value })}
            label="Require a verified email"
            description="Blocks submissions until the member confirms their email address."
            icon={<MailIcon size={14} />}
          />
          <Toggle
            checked={form.notifyStatusEmail}
            onChange={(value) => setForm({ ...form, notifyStatusEmail: value })}
            label="Email applicants on status change"
            description="Requires SMTP to be configured in the server environment. Internal notes are never emailed."
            icon={<MailIcon size={14} />}
          />
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-[15px] font-semibold text-snow">Staff positions</h2>
            <p className="mt-1 text-[10.5px] text-muted">Shown in the application's first step. Maximum 20.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] text-muted">
            {form.positions.length}/20
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {form.positions.length === 0 ? (
            <p className="text-[10.5px] text-muted">No positions yet.</p>
          ) : (
            form.positions.map((position) => (
              <span
                key={position}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10.5px] text-mist"
              >
                {position}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, positions: form.positions.filter((item) => item !== position) })}
                  className="text-muted transition hover:text-rose-300"
                  aria-label={`Remove ${position}`}
                >
                  <TrashIcon size={10} />
                </button>
              </span>
            ))
          )}
        </div>
        {errors.positions ? <p className="form-error">{errors.positions}</p> : null}

        <div className="mt-3 flex gap-2">
          <input
            className="input"
            value={positionDraft}
            onChange={(event) => setPositionDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addPosition();
              }
            }}
            placeholder="e.g. Community Support"
            maxLength={60}
            aria-label="New position name"
          />
          <button type="button" onClick={addPosition} className="btn btn-secondary btn-sm shrink-0 h-[42px]">
            <PlusIcon size={14} />
            Add
          </button>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] text-muted">Settings are stored in the database and audited on save.</p>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <Spinner size={15} /> : <SaveIcon size={15} />}
          {saving ? "Saving…" : "Save application settings"}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------- Account */

function AccountPanel({
  user,
  isOwner,
}: {
  user: { id: string; username: string; email: string; role: string; emailVerified: boolean; permissions: string };
  isOwner: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const permissions = parsePermissions(user.permissions);

  const [identity, setIdentity] = useState({ username: user.username, email: user.email, currentPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const emailChanged = identity.email.trim().toLowerCase() !== user.email.toLowerCase();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setErrors({});
    try {
      const data = await apiFetch<{ message: string }>("/api/account/profile", {
        method: "PATCH",
        body: {
          username: identity.username,
          email: identity.email,
          ...(emailChanged ? { currentPassword: identity.currentPassword } : {}),
        },
      });
      toast.push({ title: "Account updated", description: data.message, tone: "success" });
      setIdentity({ ...identity, currentPassword: "" });
      router.refresh();
    } catch (requestError) {
      if (requestError instanceof ApiClientError) {
        setError(requestError.message);
        setErrors(requestError.fields);
      } else {
        setError("Could not update your account.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function revokeOthers() {
    if (revoking) return;
    setRevoking(true);
    try {
      const data = await apiFetch<{ message: string }>("/api/account/sessions/revoke-all", { method: "POST" });
      toast.push({ title: "Other sessions signed out", description: data.message, tone: "success" });
    } catch (requestError) {
      toast.push({
        title: "Could not sign out sessions",
        description: requestError instanceof Error ? requestError.message : "Please try again.",
        tone: "error",
      });
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`grid h-12 w-12 place-items-center rounded-xl text-[14px] font-bold text-white ${
                isOwner
                  ? "bg-[linear-gradient(135deg,#f59e0b,#f97316)]"
                  : "bg-[linear-gradient(135deg,var(--brand-from),var(--brand-to))]"
              }`}
            >
              {user.username.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h2 className="font-display text-[16px] font-semibold text-snow">{user.username}</h2>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted">
                {isOwner ? "Owner · permanent account" : "Administrator"}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-2.5 py-1 text-[9px] font-medium text-emerald-300">
            <ShieldCheckIcon size={10} />
            {user.emailVerified ? "Verified" : "Unverified"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
            <p className="text-[8.5px] font-semibold uppercase tracking-[0.14em] text-muted">Permanent unique ID</p>
            <div className="mt-1 flex items-center gap-1.5">
              <code className="min-w-0 break-all font-mono text-[9.5px] text-mist">{user.id}</code>
              <CopyButton value={user.id} iconOnly label="Copy account ID" />
            </div>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
            <p className="text-[8.5px] font-semibold uppercase tracking-[0.14em] text-muted">Effective access</p>
            <p className="mt-1 text-[10px] leading-relaxed text-mist">
              {isOwner
                ? "Full control over every panel action. This account cannot be demoted or deleted."
                : permissions.length > 0
                  ? permissions.map((permission) => PERMISSIONS[permission].label).join(" · ")
                  : "No permissions assigned."}
            </p>
          </div>
        </div>

        {isOwner ? (
          <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-3.5">
            <p className="flex items-start gap-2 text-[10px] leading-relaxed text-amber-100/80">
              <ShieldCheckIcon size={13} className="mt-0.5 shrink-0" />
              You are the owner. Your account is seeded exactly once, can never be recreated over by a migration, and
              cannot be demoted, disabled or deleted by any administrator. Update your password before exposing this
              panel publicly.
            </p>
          </div>
        ) : null}
      </section>

      <form onSubmit={save} className="card p-5 sm:p-6">
        <h2 className="font-display text-[15px] font-semibold text-snow">Identity</h2>
        <p className="mt-1 text-[10.5px] text-muted">Changing your email marks it unverified and emails a fresh link.</p>

        {error ? <div className="mt-4"><Alert tone="danger">{error}</Alert></div> : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="admin-username" className="field-label"><span>Username</span></label>
            <input
              id="admin-username"
              className={`input ${errors.username ? "input-error" : ""}`}
              value={identity.username}
              onChange={(event) => setIdentity({ ...identity, username: event.target.value })}
              maxLength={24}
              minLength={3}
              required
            />
            <FieldError message={errors.username} />
          </div>
          <div>
            <label htmlFor="admin-email" className="field-label"><span>Email</span></label>
            <input
              id="admin-email"
              type="email"
              className={`input ${errors.email ? "input-error" : ""}`}
              value={identity.email}
              onChange={(event) => setIdentity({ ...identity, email: event.target.value })}
              maxLength={254}
              required
            />
            <FieldError message={errors.email} />
          </div>
        </div>

        {emailChanged ? (
          <div className="mt-4">
            <PasswordInput
              label="Current password"
              name="admin-current-password"
              value={identity.currentPassword}
              onChange={(event) => setIdentity({ ...identity, currentPassword: event.target.value })}
              placeholder="Required to change your email"
              autoComplete="current-password"
              error={errors.currentPassword}
              required
            />
          </div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? <Spinner size={14} /> : <SaveIcon size={14} />}
            {saving ? "Saving…" : "Save identity"}
          </button>
        </div>
      </form>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-[15px] font-semibold text-snow">Password & sessions</h2>
        <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
          Your password is hashed with Argon2id. Changing it signs out every other device. Use the dedicated page for the
          full form.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/change-password" className="btn btn-secondary btn-sm flex-1">
            <KeyIcon size={14} />
            Change password
          </Link>
          <button
            type="button"
            onClick={revokeOthers}
            disabled={revoking}
            className="btn btn-ghost btn-sm flex-1"
          >
            {revoking ? <Spinner size={14} /> : <RefreshIcon size={14} />}
            {revoking ? "Signing out…" : "Sign out other sessions"}
          </button>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <LockIcon size={13} className="mt-0.5 shrink-0 text-emerald-300" />
          <p className="text-[9.5px] leading-relaxed text-muted">
            Sessions are opaque, HttpOnly cookies hashed in the database. Disabling an account or changing a role revokes
            that account&apos;s sessions immediately.
          </p>
        </div>
      </section>

      {!isOwner ? (
        <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.15em] text-muted">Permission map</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ALL_PERMISSIONS.map((permission) => (
              <span
                key={permission}
                className={`rounded-md border px-2 py-1 text-[9px] ${
                  permissions.includes(permission)
                    ? "border-brand/25 bg-brand/10 text-brand-bright"
                    : "border-white/8 bg-white/[0.02] text-white/25 line-through"
                }`}
              >
                {PERMISSIONS[permission].label}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------- Audit */

function AuditPanel({ audit }: { audit: NonNullable<Props["audit"]> }) {
  const hrefFor = (page: number) => `/admin/settings?tab=audit&page=${page}`;
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
        <div>
          <h2 className="font-display text-[15px] font-semibold text-snow">Audit log</h2>
          <p className="mt-0.5 text-[10.5px] text-muted">
            Append-only record of privileged and security-relevant actions. Secrets are redacted before storage.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] text-muted">
          {audit.total} entr{audit.total === 1 ? "y" : "ies"}
        </span>
      </div>

      {audit.logs.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={<DatabaseIcon size={22} />}
            title="No audit entries yet"
            description="Sign-ins, role changes, submissions, status updates and settings edits will appear here."
          />
        </div>
      ) : (
        <div className="divide-y divide-white/6">
          {audit.logs.map((log) => (
            <article key={log.id} className="flex flex-col gap-1.5 px-5 py-3.5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/8 bg-white/[0.03] text-muted">
                  <EyeIcon size={12} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-medium text-snow">
                    {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-muted">
                    <span>{log.actor}</span>
                    {log.targetType ? (
                      <span className="font-mono text-white/30">
                        {log.targetType}
                        {log.targetId ? `:${log.targetId.slice(0, 10)}…` : ""}
                      </span>
                    ) : null}
                  </p>
                  {log.metadata ? (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-[8.5px] uppercase tracking-wide text-muted hover:text-mist">
                        Metadata
                      </summary>
                      <pre className="mt-1 max-h-32 overflow-auto rounded-lg border border-white/8 bg-black/30 p-2 font-mono text-[8.5px] leading-relaxed text-mist">
                        {formatMetadata(log.metadata)}
                      </pre>
                    </details>
                  ) : null}
                </div>
              </div>
              <time className="shrink-0 text-[9px] text-muted" dateTime={log.createdAt}>
                {formatDateTime(log.createdAt)}
              </time>
            </article>
          ))}
        </div>
      )}

      {audit.pages > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t border-white/8 px-4 py-3">
          {audit.page > 1 ? (
            <Link href={hrefFor(audit.page - 1)} className="btn btn-secondary btn-sm">
              <ChevronLeftIcon size={13} />
              Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="font-mono text-[9.5px] text-muted">
            Page {audit.page} of {audit.pages}
          </span>
          {audit.page < audit.pages ? (
            <Link href={hrefFor(audit.page + 1)} className="btn btn-secondary btn-sm">
              Older
              <ChevronRightIcon size={13} />
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </section>
  );
}

function formatMetadata(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
