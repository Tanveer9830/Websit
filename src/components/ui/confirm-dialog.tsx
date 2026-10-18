"use client";

import { useState } from "react";
import { Modal } from "./modal";
import { Spinner } from "./spinner";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "danger",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
}) {
  const [working, setWorking] = useState(false);

  async function confirm() {
    setWorking(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setWorking(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={working}>
          Cancel
        </button>
        <button
          type="button"
          className={`btn ${tone === "danger" ? "btn-danger" : "btn-primary"}`}
          onClick={confirm}
          disabled={working}
        >
          {working ? <Spinner size={15} /> : null}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
