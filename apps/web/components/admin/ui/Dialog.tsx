"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const widths = { sm: "w-[min(420px,calc(100vw_-_24px))]", md: "w-[min(560px,calc(100vw_-_24px))]", lg: "w-[min(820px,calc(100vw_-_24px))]", xl: "w-[min(1080px,calc(100vw_-_24px))]" };

/** Modal built on <dialog>: focus trap, Esc and backdrop close come from the platform. */
export function Dialog({ open, onClose, title, description, children, footer, size = "md" }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      className={cn(
        "m-auto max-h-[calc(100dvh_-_32px)] max-w-none overflow-hidden rounded-lg border border-border bg-surface p-0 text-text shadow-[0_24px_64px_-16px_rgba(28,28,26,0.35)]",
        "backdrop:bg-[rgba(26,26,24,0.5)] backdrop:backdrop-blur-[2px] open:flex open:flex-col",
        widths[size],
      )}
    >
      {open && (
        <>
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h2 id="dialog-title" className="text-[16px] font-semibold text-text">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-[13px] text-text-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 grid size-8 place-items-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text">
              <Icon name="x" size={17} />
            </button>
          </header>
          {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>}
          {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-bg px-5 py-3">{footer}</footer>}
        </>
      )}
    </dialog>
  );
}
