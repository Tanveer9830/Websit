"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "./icons";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        "input, textarea, select, button:not([data-close]), [tabindex='0']",
      );
      focusable?.focus();
    }, 30);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 w-full ${widths[size]} animate-scale-in overflow-hidden rounded-3xl border border-white/12 bg-deep/95 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] backdrop-blur-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-lg font-semibold text-snow">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-relaxed text-mist">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            data-close
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-mist transition hover:text-snow"
            aria-label="Close"
          >
            <XIcon size={15} />
          </button>
        </div>
        <div className="max-h-[min(72vh,720px)] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
