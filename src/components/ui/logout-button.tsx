"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";
import { LogOutIcon } from "./icons";
import { Spinner } from "./spinner";

export function LogoutButton({
  className = "nav-link w-full",
  label = "Sign out",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);

  async function signOut() {
    if (working) return;
    setWorking(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* Even if the request fails, return to the public site. */
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <button type="button" onClick={signOut} disabled={working} className={className}>
      {working ? <Spinner size={16} /> : <LogOutIcon size={16} />}
      <span>{working ? "Signing out…" : label}</span>
    </button>
  );
}
