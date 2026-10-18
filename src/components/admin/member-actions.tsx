"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { ALL_PERMISSIONS, PERMISSIONS, parsePermissions, type Permission } from "@/lib/permissions";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  CheckCircleIcon,
  KeyIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
} from "@/components/ui/icons";

type Member = {
  id: string;
  username: string;
  role: string;
  permissions: string;
  isDisabled: boolean;
};

type Mode = "promote" | "demote" | "disable" | "enable" | null;

export function MemberActions({ member }: { member: Member }) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>(null);
  const [selected, setSelected] = useState<Permission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function openPromote() {
    const current = parsePermissions(member.permissions);
    setSelected(current.length > 0 ? current : ["REVIEW_APPLICATIONS"]);
    setError(null);
    setMode("promote");
    setMenuOpen(false);
  }

  function openConfirm(next: Exclude<Mode, "promote" | null>) {
    setError(null);
    setMode(next);
    setMenuOpen(false);
  }

  function togglePermission(permission: Permission) {
    setSelected((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  }

  async function saveRole() {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      const data = await apiFetch<{ message: string }>(`/api/admin/members/${member.id}/role`, {
        method: "POST",
        body: { role: "ADMIN", permissions: selected },
      });
      toast.push({ title: "Administrator access saved", description: data.message, tone: "success" });
      setMode(null);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError
          ? requestError.message
          : "Could not update this member's access.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function demote() {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      const data = await apiFetch<{ message: string }>(`/api/admin/members/${member.id}/role`, {
        method: "POST",
        body: { role: "MEMBER", permissions: [] },
      });
      toast.push({ title: "Admin access revoked", description: data.message, tone: "success" });
      setMode(null);
      router.refresh();
    } catch (requestError) {
      const message =
        requestError instanceof ApiClientError
          ? requestError.message
          : "Could not revoke this administrator.";
      setError(message);
      toast.push({ title: "Could not revoke access", description: message, tone: "error" });
    } finally {
      setWorking(false);
    }
  }

  async function setDisabled(disabled: boolean) {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      const data = await apiFetch<{ message: string }>(`/api/admin/members/${member.id}/status`, {
        method: "POST",
        body: { disabled },
      });
      toast.push({
        title: disabled ? "Member disabled" : "Member re-enabled",
        description: data.message,
        tone: "success",
      });
      setMode(null);
      router.refresh();
    } catch (requestError) {
      const message =
        requestError instanceof ApiClientError
          ? requestError.message
          : "Could not update this member's account.";
      setError(message);
      toast.push({ title: "Could not update account", description: message, tone: "error" });
    } finally {
      setWorking(false);
    }
  }

  if (member.role === "OWNER") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-2 py-1 text-[8.5px] font-semibold uppercase tracking-wide text-amber-200">
        <ShieldCheckIcon size={9} />
        Protected
      </span>
    );
  }

  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        onClick={() => setMenuOpen((current) => !current)}
        className="btn btn-secondary btn-sm"
        aria-expanded={menuOpen}
      >
        Manage
      </button>
      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            tabIndex={-1}
          />
          <div className="absolute right-0 top-full z-40 mt-1.5 w-56 overflow-hidden rounded-xl border border-white/10 bg-deep/95 p-1.5 shadow-2xl backdrop-blur-xl">
            {member.role === "MEMBER" ? (
              <button
                type="button"
                onClick={openPromote}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] text-mist transition hover:bg-white/5 hover:text-snow"
              >
                <KeyIcon size={13} className="text-brand-bright" />
                Grant admin access
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openPromote}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] text-mist transition hover:bg-white/5 hover:text-snow"
                >
                  <UsersIcon size={13} className="text-brand-bright" />
                  Edit permissions
                </button>
                <button
                  type="button"
                  onClick={() => openConfirm("demote")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] text-rose-300/80 transition hover:bg-rose-500/10 hover:text-rose-200"
                >
                  <UserIcon size={13} />
                  Revoke admin access
                </button>
              </>
            )}
            <div className="my-1 h-px bg-white/7" />
            {member.isDisabled ? (
              <button
                type="button"
                onClick={() => openConfirm("enable")}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] text-emerald-300/80 transition hover:bg-emerald-500/10 hover:text-emerald-200"
              >
                <CheckCircleIcon size={13} />
                Re-enable account
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openConfirm("disable")}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] text-rose-300/80 transition hover:bg-rose-500/10 hover:text-rose-200"
              >
                <ShieldCheckIcon size={13} />
                Disable account
              </button>
            )}
          </div>
        </>
      ) : null}

      <Modal
        open={mode === "promote"}
        onClose={() => setMode(null)}
        title={member.role === "ADMIN" ? "Edit administrator access" : "Grant administrator access"}
        description={`Choose exactly which privileged actions ${member.username} can perform. Permissions are enforced on the server for every request.`}
        size="md"
      >
        <div className="space-y-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <div className="space-y-2">
            {ALL_PERMISSIONS.map((permission) => {
              const checked = selected.includes(permission);
              return (
                <label
                  key={permission}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                    checked
                      ? "border-brand/35 bg-brand/[0.08]"
                      : "border-white/8 bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePermission(permission)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>
                    <span className="block text-[11.5px] font-medium text-snow">{PERMISSIONS[permission].label}</span>
                    <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">
                      {PERMISSIONS[permission].description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-3">
            <p className="flex items-start gap-2 text-[10px] leading-relaxed text-amber-100/80">
              <ShieldCheckIcon size={12} className="mt-0.5 shrink-0" />
              Promoting revokes all of this member&apos;s sessions. They must sign in again and set a new password before
              using the admin panel. Only the owner can grant or revoke this access.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-white/8 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setMode(null)} className="btn btn-secondary" disabled={working}>
              Cancel
            </button>
            <button
              type="button"
              onClick={saveRole}
              className="btn btn-primary"
              disabled={working || selected.length === 0}
            >
              {working ? <Spinner size={15} /> : <KeyIcon size={15} />}
              {working ? "Saving…" : member.role === "ADMIN" ? "Save permissions" : "Grant admin access"}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={mode === "demote"}
        onClose={() => setMode(null)}
        onConfirm={demote}
        title={`Revoke admin access for ${member.username}?`}
        description="They become a regular member immediately. Their sessions are revoked, all admin permissions are cleared, and their applications remain untouched. Only the owner can restore access."
        confirmLabel="Revoke access"
        tone="danger"
      />

      <ConfirmDialog
        open={mode === "disable"}
        onClose={() => setMode(null)}
        onConfirm={() => setDisabled(true)}
        title={`Disable ${member.username}?`}
        description="The account is signed out everywhere and cannot sign in until re-enabled. Their member ID, applications and history are preserved. The owner account can never be disabled."
        confirmLabel="Disable account"
        tone="danger"
      />

      <ConfirmDialog
        open={mode === "enable"}
        onClose={() => setMode(null)}
        onConfirm={() => setDisabled(false)}
        title={`Re-enable ${member.username}?`}
        description="They will be able to sign in again with their existing password. No sessions are restored automatically."
        confirmLabel="Re-enable account"
        tone="primary"
      />
    </div>
  );
}
