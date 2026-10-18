"use client";

import { useState, type InputHTMLAttributes } from "react";
import { EyeIcon, EyeOffIcon } from "./icons";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  error?: string;
  hint?: string;
  hideLabel?: boolean;
};

export function PasswordInput({ label, error, hint, hideLabel = false, id, className = "", ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? props.name ?? "password";

  return (
    <div>
      {!hideLabel ? (
        <label htmlFor={inputId} className="field-label">
          <span>{label}</span>
        </label>
      ) : null}
      <div className="relative">
        <input
          {...props}
          id={inputId}
          type={visible ? "text" : "password"}
          className={`input pr-12 ${error ? "input-error" : ""} ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-snow"
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={0}
        >
          {visible ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
        </button>
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="form-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="form-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
