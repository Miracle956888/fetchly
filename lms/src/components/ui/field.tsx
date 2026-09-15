"use client";

import * as React from "react";
import { useId } from "react";
import { clsx } from "../../lib/clsx";

/**
 * Form field primitives. Every input pairs with a <label> (a11y), shows inline
 * errors (wired via aria-describedby), and shares one consistent style.
 *
 * Usage:
 *   <Field label="Email" error={errors.email} required>
 *     <Input type="email" value={...} onChange={...} />
 *   </Field>
 */

const FieldContext = React.createContext<{ id: string; error?: string } | null>(null);

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  const autoId = useId();
  return (
    <FieldContext.Provider value={{ id: autoId, error }}>
      <div className={clsx("flex flex-col gap-1.5", className)}>
        {label && (
          <label htmlFor={autoId} className="text-[13px] font-medium text-ink-800">
            {label}
            {required && (
              <span className="ml-0.5 text-danger-600" aria-hidden>
                *
              </span>
            )}
          </label>
        )}
        {children}
        {error ? (
          <p id={`${autoId}-error`} role="alert" className="text-[13px] text-danger-600">
            {error}
          </p>
        ) : hint ? (
          <p className="text-[12px] text-ink-500">{hint}</p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

function useFieldWiring(overrideId?: string) {
  const ctx = React.useContext(FieldContext);
  const id = overrideId ?? ctx?.id;
  return {
    id,
    "aria-invalid": ctx?.error ? (true as const) : undefined,
    "aria-describedby": ctx?.error && id ? `${id}-error` : undefined,
    hasError: !!ctx?.error,
  };
}

const inputBase =
  "h-9.5 w-full rounded-btn border bg-surface px-3 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:outline-none focus:ring-2";
const inputOk = "border-ink-200 focus:border-brand-500 focus:ring-brand-100";
const inputErr = "border-danger-600 focus:ring-danger-100";

export function Input({ className, id, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  const w = useFieldWiring(id);
  return <input {...w} className={clsx(inputBase, w.hasError ? inputErr : inputOk, className)} {...rest} />;
}

export function Textarea({ className, id, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const w = useFieldWiring(id);
  return (
    <textarea {...w} rows={4} className={clsx(inputBase, "min-h-24 py-2.5 leading-6", w.hasError ? inputErr : inputOk, className)} {...rest} />
  );
}

export function Select({ className, id, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const w = useFieldWiring(id);
  return (
    <select {...w} className={clsx(inputBase, "pr-8", w.hasError ? inputErr : inputOk, className)} {...rest}>
      {children}
    </select>
  );
}
