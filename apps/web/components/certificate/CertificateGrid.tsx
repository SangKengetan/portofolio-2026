"use client";

import { useState } from "react";
import type { Certificate } from "@portfolio/shared";
import { cn } from "@/lib/utils";
import { CertificateCard } from "./CertificateCard";
import { CertificateModal } from "./CertificateModal";

interface CertificateGridProps {
  certificates: Certificate[];
  variant?: "full" | "compact";
  className?: string;
}

/** Grid of certificate cards; clicking one opens the preview modal. */
export function CertificateGrid({ certificates, variant = "full", className }: CertificateGridProps) {
  const [selected, setSelected] = useState<Certificate | null>(null);
  return (
    <>
      <ul className={cn("grid gap-4", className)}>
        {certificates.map((c) => (
          <li key={c.id}>
            <CertificateCard certificate={c} onOpen={setSelected} variant={variant} />
          </li>
        ))}
      </ul>
      <CertificateModal certificate={selected} onClose={() => setSelected(null)} />
    </>
  );
}
