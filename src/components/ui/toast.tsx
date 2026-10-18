"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircleIcon, AlertTriangleIcon, ShieldCheckIcon, XIcon } from "./icons";

type ToastTone = "success" | "error" | "info";
type ToastItem = { id: string; title: string; description?: string; tone: ToastTone };

const ToastContext = createContext<{
  push: (toast: { title: string; description?: string; tone?: ToastTone }) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    ({ title, description, tone = "success" }: { title: string; description?: string; tone?: ToastTone }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((current) => [...current.slice(-3), { id, title, description, tone }]);
      window.setTimeout(() => dismiss(id), 5200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[120] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl ${
              toast.tone === "success"
                ? "border-emerald-400/25 bg-emerald-950/90 text-emerald-50"
                : toast.tone === "error"
                  ? "border-rose-400/25 bg-rose-950/90 text-rose-50"
                  : "border-sky-400/25 bg-sky-950/90 text-sky-50"
            }`}
          >
            <span className="mt-0.5 shrink-0">
              {toast.tone === "success" ? (
                <CheckCircleIcon size={17} className="text-emerald-300" />
              ) : toast.tone === "error" ? (
                <ShieldCheckIcon size={17} className="text-rose-300" />
              ) : (
                <AlertTriangleIcon size={17} className="text-sky-300" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 text-xs leading-relaxed opacity-80">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="shrink-0 rounded-md p-1 opacity-60 transition hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <XIcon size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { push: () => undefined };
  }
  return context;
}
