"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string> {
  value: T;
  label: string;
  /** Shows a dot (e.g. a tab contains a validation error). */
  alert?: boolean;
  count?: number;
}

/** Underlined tabs with arrow-key navigation (WAI-ARIA tabs pattern). */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  idPrefix,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  idPrefix: string;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + items.length) % items.length;
    refs.current[next]?.focus();
    onChange(items[next]!.value);
  };
  return (
    <div className={cn("no-scrollbar -mx-1 overflow-x-auto px-1", className)}>
      <div role="tablist" aria-label={label} className="flex w-max gap-1 border-b border-border">
        {items.map((item, i) => {
          const active = item.value === value;
          return (
            <button
              key={item.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={`${idPrefix}-tab-${item.value}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`${idPrefix}-panel-${item.value}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(item.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "relative -mb-px inline-flex h-10 items-center gap-1.5 border-b-2 px-3 text-[13.5px] whitespace-nowrap transition-colors",
                active ? "border-text font-medium text-text" : "border-transparent text-text-muted hover:text-text",
              )}
            >
              {item.label}
              {item.count !== undefined && <span className="font-mono text-[11px] text-text-subtle">{item.count}</span>}
              {item.alert && <span className="size-1.5 rounded-full bg-danger" aria-label="has errors" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TabPanel({ idPrefix, value, active, children }: { idPrefix: string; value: string; active: boolean; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`${idPrefix}-panel-${value}`} aria-labelledby={`${idPrefix}-tab-${value}`} hidden={!active} tabIndex={0} className="outline-none">
      {active && children}
    </div>
  );
}
