"use client";

import { useMemo, useState } from "react";
import type { ProjectCategory, ProjectSummary } from "@portfolio/shared";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { CategoryTabs, type TabOption } from "@/components/project/CategoryTabs";
import { ProjectCard } from "@/components/project/ProjectCard";

type Filter = "all" | ProjectCategory;
const LIMIT = 4;

/** ④ Selected projects — featured first, filterable by category. */
export function SelectedProjects({ projects }: { projects: ProjectSummary[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const options: TabOption<Filter>[] = [
    { value: "all", label: "All" },
    { value: "web", label: "Web" },
    { value: "uiux", label: "UI/UX" },
    { value: "data", label: "Data" },
  ];

  const visible = useMemo(
    () =>
      projects
        .filter((p) => filter === "all" || p.category === filter)
        .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured))
        .slice(0, LIMIT),
    [projects, filter],
  );

  return (
    <section id="projects" data-theme="light" aria-labelledby="projects-title" className="bg-bg section-y">
      <div className="container-site">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>Selected work</SectionLabel>
            <h2 id="projects-title" className="mt-2 text-h2 font-semibold tracking-[-0.03em] uppercase">
              Selected projects
            </h2>
          </div>
          <Button href={filter === "all" ? "/projects" : `/projects?category=${filter}`} variant="ghost" size="sm" icon="arrow-right">
            View all projects
          </Button>
        </div>

        <CategoryTabs className="mt-8" label="Filter projects by category" options={options} value={filter} onChange={setFilter} />

        <ul className="mt-8 grid gap-x-4 gap-y-6 md:grid-cols-2 md:gap-x-6" aria-live="polite">
          {visible.map((project, i) => (
            <li key={project.id}>
              <Reveal delay={(i % 2) * 80}>
                <ProjectCard project={project} />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
