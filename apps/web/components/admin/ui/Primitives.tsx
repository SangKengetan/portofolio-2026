import type { ReactNode } from "react";
import Link from "next/link";
import type { PublishStatus } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/Icon";

export function Spinner({ size = 16, className, label = "Loading" }: { size?: number; className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={cn("inline-block animate-spin rounded-full border-2 border-current border-r-transparent opacity-70 motion-reduce:animate-none", className)} style={{ width: size, height: size }} />
  );
}

const statusTone: Record<PublishStatus, string> = {
  published: "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-success",
  draft: "bg-surface-2 text-text-muted",
  archived: "bg-surface-2 text-text-subtle line-through decoration-1",
};

export function StatusBadge({ status }: { status: PublishStatus }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium capitalize", statusTone[status])}>
      <span className={cn("size-1.5 rounded-full", status === "published" ? "bg-success" : "bg-text-subtle")} aria-hidden="true" />
      {status}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:mb-8">
      {back && (
        <Link href={back.href} className="inline-flex w-fit items-center gap-1.5 text-[13px] text-text-muted hover:text-text">
          <Icon name="arrow-left" size={14} />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-text md:text-[30px]">{title}</h1>
          {description && <p className="mt-1.5 max-w-[70ch] text-[14px] text-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Card({ title, description, children, className, actions }: { title?: string; description?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-lg border border-border bg-surface", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-text">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-text-muted">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="flex flex-col gap-5 p-5">{children}</div>
    </section>
  );
}

export function EmptyState({ icon = "folder", title, description, action }: { icon?: IconName; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-14 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-surface-2 text-text-muted">
        <Icon name={icon} size={20} />
      </span>
      <div>
        <p className="text-[15px] font-semibold text-text">{title}</p>
        {description && <p className="mt-1 max-w-[46ch] text-[13px] text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-danger/40 bg-[color-mix(in_srgb,var(--danger)_6%,transparent)] p-5">
      <p className="flex items-center gap-2 text-[14px] font-medium text-danger">
        <Icon name="alert-circle" size={16} />
        {message}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 text-[13px] text-text underline-offset-4 hover:underline">
          <Icon name="refresh" size={14} />
          Try again
        </button>
      )}
    </div>
  );
}

export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-md bg-surface-2 motion-reduce:animate-none" />
      ))}
    </div>
  );
}

/** Small square icon-only button for row actions. */
export function IconButton({
  icon,
  label,
  onClick,
  href,
  tone = "default",
  disabled,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  href?: string;
  tone?: "default" | "danger";
  disabled?: boolean;
}) {
  const cls = cn(
    "grid size-9 shrink-0 place-items-center rounded-sm text-text-muted transition-colors duration-150 hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40",
    tone === "danger" ? "hover:text-danger" : "hover:text-text",
  );
  if (href)
    return (
      <Link href={href} aria-label={label} title={label} className={cls}>
        <Icon name={icon} size={16} />
      </Link>
    );
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} disabled={disabled} className={cls}>
      <Icon name={icon} size={16} />
    </button>
  );
}
