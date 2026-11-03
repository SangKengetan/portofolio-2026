import type { CertificateCategory } from "@portfolio/shared";
import { categoryLabels, cn } from "@/lib/utils";

const tone: Record<CertificateCategory, string> = {
  web: "bg-[var(--chip-web-bg)] text-[var(--chip-web-fg)]",
  uiux: "bg-[var(--chip-uiux-bg)] text-[var(--chip-uiux-fg)]",
  data: "bg-[var(--chip-data-bg)] text-[var(--chip-data-fg)]",
  other: "bg-[var(--chip-other-bg)] text-[var(--chip-other-fg)]",
};

interface ChipProps {
  /** Colour follows the category (section 3.1). Omit for a neutral chip. */
  category?: CertificateCategory;
  /** Defaults to the category name. */
  label?: string;
  className?: string;
}

export function Chip({ category, label, className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-sm px-2 font-mono text-[11px] font-medium tracking-[0.04em] uppercase",
        category ? tone[category] : "border border-border bg-surface text-text-muted",
        className,
      )}
    >
      {label ?? (category ? categoryLabels[category] : "")}
    </span>
  );
}
