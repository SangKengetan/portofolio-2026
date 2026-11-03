import { cn } from "@/lib/utils";

const alignClass = {
  center: "left-1/2 -translate-x-1/2",
  left: "left-0",
  right: "right-0",
} as const;

interface GhostHeadingProps {
  text: string;
  align?: keyof typeof alignClass;
  /** Vertical position / extra classes, e.g. "top-1/2 -translate-y-1/2" */
  className?: string;
}

/**
 * Giant, nearly transparent word behind a section (e.g. "EXPERIENCES").
 * Purely decorative — hidden from assistive technology.
 */
export function GhostHeading({ text, align = "center", className }: GhostHeadingProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute select-none whitespace-nowrap uppercase text-display-ghost",
        "text-[color-mix(in_srgb,var(--text)_5%,transparent)]",
        alignClass[align],
        className,
      )}
    >
      {text}
    </span>
  );
}
