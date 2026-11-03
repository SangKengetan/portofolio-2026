"use client";

import { cn } from "@/lib/utils";

export interface TabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface CategoryTabsProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
  /** Scroll edge-to-edge on small screens (site pages). Off inside the admin. */
  bleed?: boolean;
}

/** Pill filter tabs; scrolls horizontally on small screens (section 5.1). */
export function CategoryTabs<T extends string>({ options, value, onChange, label, className, bleed = true }: CategoryTabsProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn("no-scrollbar overflow-x-auto", bleed && "-mx-[var(--gutter)] px-[var(--gutter)]", className)}>
      <div className="flex w-max gap-2">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              disabled={opt.count === 0}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-small font-medium whitespace-nowrap transition-colors duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-40",
                active
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-transparent text-text-muted hover:border-text-subtle hover:text-text",
              )}
            >
              {opt.label}
              {opt.count !== undefined && (
                <span className={cn("font-mono text-[11px]", active ? "text-accent-fg/70" : "text-text-subtle")}>({opt.count})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
