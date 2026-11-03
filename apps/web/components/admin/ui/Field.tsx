"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";

export const controlClass = (invalid?: boolean) =>
  cn(
    "w-full rounded-sm border bg-surface px-3 text-[14px] text-text placeholder:text-text-subtle transition-colors duration-150",
    "hover:border-text-subtle focus:border-text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
    "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-60",
    invalid ? "border-danger" : "border-border",
  );

interface FieldShellProps {
  label: string;
  id: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  /** Small text on the right of the label (e.g. a character counter). */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Label + control + hint/error, with aria wiring. */
export function FieldShell({ label, id, hint, error, required, aside, className, children }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-text">
          {label}
          {required && (
            <span className="text-danger" aria-hidden="true">
              {" "}*
            </span>
          )}
        </label>
        {aside && <span className="text-[12px] text-text-subtle">{aside}</span>}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-[12.5px] text-danger">
          <Icon name="alert-circle" size={14} className="mt-px shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12.5px] text-text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: ReactNode) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

type BaseProps = { label: string; hint?: ReactNode; error?: string; className?: string; showCount?: boolean };

export function TextField({
  label,
  hint,
  error,
  className,
  showCount,
  value,
  onChange,
  ...rest
}: BaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & { value: string; onChange: (value: string) => void }) {
  const id = useId();
  const count = showCount && rest.maxLength ? `${value.length}/${rest.maxLength}` : undefined;
  return (
    <FieldShell label={label} id={id} hint={hint} error={error} required={rest.required} aside={count} className={className}>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(controlClass(!!error), "h-10")}
        {...rest}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  showCount,
  value,
  onChange,
  rows = 4,
  ...rest
}: BaseProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & { value: string; onChange: (value: string) => void }) {
  const id = useId();
  const count = showCount && rest.maxLength ? `${value.length}/${rest.maxLength}` : undefined;
  return (
    <FieldShell label={label} id={id} hint={hint} error={error} required={rest.required} aside={count} className={className}>
      <textarea
        id={id}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(controlClass(!!error), "resize-y py-2.5 leading-relaxed")}
        {...rest}
      />
    </FieldShell>
  );
}

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

export function SelectField<T extends string>({
  label,
  hint,
  error,
  className,
  value,
  onChange,
  options,
  placeholder,
  ...rest
}: BaseProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> & {
    value: T | "";
    onChange: (value: T) => void;
    options: SelectOption<T>[];
    placeholder?: string;
  }) {
  const id = useId();
  return (
    <FieldShell label={label} id={id} hint={hint} error={error} required={rest.required} className={className}>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          aria-invalid={!!error}
          aria-describedby={describedBy(id, error, hint)}
          className={cn(controlClass(!!error), "h-10 cursor-pointer appearance-none pr-9")}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-text-muted" />
      </div>
    </FieldShell>
  );
}

/** On/off toggle (role="switch"). */
export function Switch({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-[13px] font-medium text-text">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="mt-0.5 text-[12.5px] text-text-subtle">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 disabled:opacity-50",
          checked ? "border-accent bg-accent" : "border-border bg-surface-2",
        )}
      >
        <span
          className={cn(
            "inline-block size-4.5 rounded-full shadow-sm transition-transform duration-200",
            checked ? "translate-x-5.5 bg-accent-fg" : "translate-x-0.5 bg-surface",
          )}
        />
      </button>
    </div>
  );
}
