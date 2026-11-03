"use client";

import { useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { FieldShell, controlClass } from "./Field";

interface TagInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  /** Field errors from the API, keyed by the field name (e.g. "highlights" or "highlights.2"). */
  errors?: Record<string, string>;
  name: string;
  placeholder?: string;
  hint?: string;
  maxItems?: number;
  maxLength?: number;
  numbered?: boolean;
  className?: string;
}

/** Editable list of short texts (roles, highlights, contributions, list items). */
export function TagInput({
  label,
  values,
  onChange,
  errors = {},
  name,
  placeholder,
  hint,
  maxItems = 20,
  maxLength,
  numbered,
  className,
}: TagInputProps) {
  const id = useId();
  const listRef = useRef<HTMLOListElement>(null);

  const update = (i: number, v: string) => onChange(values.map((x, j) => (j === i ? v : x)));
  const remove = (i: number) => onChange(values.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= values.length) return;
    const next = [...values];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  const add = () => {
    if (values.length >= maxItems) return;
    onChange([...values, ""]);
    requestAnimationFrame(() => {
      const inputs = listRef.current?.querySelectorAll("input");
      inputs?.[inputs.length - 1]?.focus();
    });
  };

  return (
    <FieldShell label={label} id={`${id}-0`} hint={hint} error={errors[name]} aside={`${values.length}/${maxItems}`} className={className}>
      <ol ref={listRef} className="flex flex-col gap-2">
        {values.map((value, i) => {
          const err = errors[`${name}.${i}`];
          return (
            <li key={i} className="flex flex-col gap-1">
              <div className="group flex items-center gap-2">
                {numbered && <span className="w-6 shrink-0 text-right font-mono text-[12px] text-text-subtle">{String(i + 1).padStart(2, "0")}</span>}
                <input
                  id={`${id}-${i}`}
                  value={value}
                  maxLength={maxLength}
                  placeholder={placeholder}
                  aria-label={`${label} ${i + 1}`}
                  aria-invalid={!!err}
                  onChange={(e) => update(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      add();
                    }
                  }}
                  className={cn(controlClass(!!err), "h-9")}
                />
                <div className="flex shrink-0 items-center">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${label} ${i + 1} up`} className="grid size-8 place-items-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30">
                    <Icon name="chevron-up" size={15} />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === values.length - 1} aria-label={`Move ${label} ${i + 1} down`} className="grid size-8 place-items-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30">
                    <Icon name="chevron-down" size={15} />
                  </button>
                  <button type="button" onClick={() => remove(i)} aria-label={`Remove ${label} ${i + 1}`} className="grid size-8 place-items-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-danger">
                    <Icon name="x" size={15} />
                  </button>
                </div>
              </div>
              {err && <p className="pl-1 text-[12.5px] text-danger">{err}</p>}
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={add}
        disabled={values.length >= maxItems}
        className="mt-1 inline-flex h-9 w-fit items-center gap-1.5 rounded-sm border border-dashed border-border px-3 text-[13px] text-text-muted transition-colors hover:border-text-subtle hover:text-text disabled:opacity-40"
      >
        <Icon name="plus" size={14} />
        Add item
      </button>
    </FieldShell>
  );
}
