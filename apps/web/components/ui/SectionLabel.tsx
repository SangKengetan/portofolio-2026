import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Small mono uppercase label above section headings. */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-label text-text-subtle", className)}>{children}</p>;
}
