"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProjectCategory, ProjectSummary } from "@portfolio/shared";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { CategoryTabs, type TabOption } from "./CategoryTabs";
import { ProjectCard } from "./ProjectCard";

export type ProjectFilter = "all" | ProjectCategory;
export type ProjectSort = "newest" | "oldest" | "az";

const sortLabels: Record<ProjectSort, string> = { newest: "Newest", oldest: "Oldest", az: "A–Z" };

interface ProjectsBrowserProps {
  projects: ProjectSummary[];
  initialCategory: ProjectFilter;
  initialSort: ProjectSort;
}

/**
 * Filter + sort for /projects. State is mirrored to the query string
 * (/projects?category=data&sort=oldest) so a filtered view can be shared.
 */
export function ProjectsBrowser({ projects, initialCategory, initialSort }: ProjectsBrowserProps) {
  const [category, setCategory] = useState<ProjectFilter>(initialCategory);
  const [sort, setSort] = useState<ProjectSort>(initialSort);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (category === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", category);
    if (sort === "newest") url.searchParams.delete("sort");
    else url.searchParams.set("sort", sort);
    window.history.replaceState(window.history.state, "", url);
  }, [category, sort]);

  const counts = useMemo(() => {
    const c = { all: projects.length, web: 0, uiux: 0, data: 0 };
    for (const p of projects) c[p.category]++;
    return c;
  }, [projects]);

  const options: TabOption<ProjectFilter>[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "web", label: "Web", count: counts.web },
    { value: "uiux", label: "UI/UX", count: counts.uiux },
    { value: "data", label: "Data", count: counts.data },
  ];

  const list = useMemo(() => {
    const filtered = projects.filter((p) => category === "all" || p.category === category);
    return [...filtered].sort((a, b) =>
      sort === "az"
        ? a.title.localeCompare(b.title)
        : sort === "oldest"
          ? a.publishedAt.localeCompare(b.publishedAt)
          : b.publishedAt.localeCompare(a.publishedAt),
    );
  }, [projects, category, sort]);

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CategoryTabs label="Filter projects by category" options={options} value={category} onChange={setCategory} />
        <label className="relative inline-flex w-fit items-center gap-2 text-small text-text-muted">
          <span>Sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ProjectSort)}
            className="h-9 cursor-pointer appearance-none rounded-full border border-border bg-surface pr-9 pl-4 text-small font-medium text-text transition-colors hover:border-text-subtle"
          >
            {(Object.keys(sortLabels) as ProjectSort[]).map((s) => (
              <option key={s} value={s}>
                {sortLabels[s]}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" size={14} className="pointer-events-none absolute right-3.5 text-text-muted" />
        </label>
      </div>

      <p className="sr-only" aria-live="polite">
        Showing {list.length} project{list.length === 1 ? "" : "s"}
      </p>

      {list.length === 0 ? (
        <p className="mt-16 text-center text-body text-text-muted">No projects in this category yet.</p>
      ) : (
        <ul className="mt-10 grid gap-x-4 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          {list.map((project, i) => (
            <li key={project.id}>
              <Reveal delay={(i % 3) * 70}>
                <ProjectCard project={project} size="md" priority={i < 3} />
              </Reveal>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
