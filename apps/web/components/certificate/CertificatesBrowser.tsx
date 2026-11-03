"use client";

import { useMemo, useState } from "react";
import type { Certificate, CertificateCategory } from "@portfolio/shared";
import { CategoryTabs, type TabOption } from "@/components/project/CategoryTabs";
import { CertificateGrid } from "./CertificateGrid";

type Filter = "all" | CertificateCategory;

export function CertificatesBrowser({ certificates }: { certificates: Certificate[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const options: TabOption<Filter>[] = useMemo(() => {
    const count = (c: CertificateCategory) => certificates.filter((x) => x.category === c).length;
    return [
      { value: "all", label: "All", count: certificates.length },
      { value: "web", label: "Web", count: count("web") },
      { value: "uiux", label: "UI/UX", count: count("uiux") },
      { value: "data", label: "Data", count: count("data") },
      { value: "other", label: "Other", count: count("other") },
    ];
  }, [certificates]);

  const list = filter === "all" ? certificates : certificates.filter((c) => c.category === filter);

  return (
    <>
      <CategoryTabs label="Filter certificates by category" options={options} value={filter} onChange={setFilter} />
      <p className="sr-only" aria-live="polite">
        Showing {list.length} certificate{list.length === 1 ? "" : "s"}
      </p>
      <CertificateGrid key={filter} certificates={list} className="mt-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
    </>
  );
}
