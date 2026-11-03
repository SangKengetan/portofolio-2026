import { cn } from "@/lib/utils";

/**
 * Two-letter tile used for tech/issuer logos until real icons are added.
 * TODO(asset): map `iconKey` to Simple Icons (https://simpleicons.org) or uploaded logos.
 */
export function Monogram({ name, className }: { name: string; className?: string }) {
  const letters = name
    .replace(/[^A-Za-z0-9 .]/g, "")
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .padEnd(2, name[1]?.toLowerCase() ?? "");
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-sm bg-surface-2 font-mono text-[11px] font-semibold text-text",
        className,
      )}
    >
      {letters}
    </span>
  );
}
