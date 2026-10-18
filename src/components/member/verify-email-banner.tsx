"use client";

import { useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

export function VerifyEmailBanner({ email }: { email: string }) {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function resend() {
    if (working) return;
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      const data = await apiFetch<{ message: string }>("/api/auth/resend-verification", {
        method: "POST",
      });
      setMessage(data.message);
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError
          ? requestError.message
          : "Could not resend the verification email.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mb-5">
      <Alert
        tone={error ? "danger" : "warning"}
        title={error ? "Verification email failed" : "Your email isn't verified yet"}
        action={
          <div className="flex items-center gap-2">
            <button type="button" onClick={resend} disabled={working} className="btn btn-secondary btn-sm">
              {working ? <Spinner size={13} /> : null}
              {working ? "Sending…" : "Resend"}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-[11px] text-amber-200/70 hover:text-amber-100"
              aria-label="Dismiss"
            >
              Dismiss
            </button>
          </div>
        }
      >
        {message ?? error ?? (
          <>
            We sent a link to <span className="font-medium">{email}</span>. Verifying keeps password recovery and
            status emails working. You can still apply if the owner hasn&apos;t required verification.
          </>
        )}
      </Alert>
    </div>
  );
}
