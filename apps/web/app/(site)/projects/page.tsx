import type { Metadata } from "next";
import type { ProjectFilter, ProjectSort } from "@/components/project/ProjectsBrowser";
import { ProjectsView } from "@/components/views/ProjectsView";
import { getProjects } from "@/lib/api";
import { isProjectCategory } from "@/lib/utils";

export const metadata: Metadata = {
  title: "All projects",
  description: "Web systems, UI/UX case studies and data analyses.",
  alternates: { canonical: "/projects" },
};

type SearchParams = Promise<{ category?: string; sort?: string }>;

export default async function ProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ category, sort }, projects] = await Promise.all([searchParams, getProjects()]);
  const initialCategory: ProjectFilter = isProjectCategory(category) ? category : "all";
  const initialSort: ProjectSort = sort === "oldest" || sort === "az" ? sort : "newest";
  return <ProjectsView projects={projects} initialCategory={initialCategory} initialSort={initialSort} />;
}
