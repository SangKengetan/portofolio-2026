import type { ProjectSummary } from "@portfolio/shared";
import { GhostHeading } from "@/components/ui/GhostHeading";
import { CtaBanner } from "@/components/project/CtaBanner";
import { ProjectsBrowser, type ProjectFilter, type ProjectSort } from "@/components/project/ProjectsBrowser";

interface ProjectsViewProps {
  projects: ProjectSummary[];
  initialCategory: ProjectFilter;
  initialSort: ProjectSort;
}

/** /projects — all projects with category filter (section 5.2). */
export function ProjectsView({ projects, initialCategory, initialSort }: ProjectsViewProps) {
  return (
    <div data-theme="light" className="bg-bg">
      <header className="relative overflow-x-clip pt-[calc(var(--nav-h)_+_48px)] pb-10 md:pt-[calc(var(--nav-h)_+_80px)]">
        <div className="container-site relative">
          <GhostHeading text="Work" align="right" className="top-1/2 -translate-y-1/2" />
          <h1 className="relative text-display-xl text-text">
            All projects<span className="font-serif font-normal italic">.</span>
          </h1>
          <p className="relative mt-5 max-w-[52ch] text-body-lg text-text-muted">
            Web systems, UI/UX case studies and data analyses — each one told as a story: the problem, the process, and
            what changed because of it.
          </p>
        </div>
      </header>

      <section aria-label="Projects" className="container-site pb-[var(--section-y)]">
        <ProjectsBrowser projects={projects} initialCategory={initialCategory} initialSort={initialSort} />
        <div className="mt-[var(--section-y)]">
          <CtaBanner />
        </div>
      </section>
    </div>
  );
}
