import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailView } from "@/components/views/ProjectDetailView";
import { getProject, getProjects } from "@/lib/api";
import { categoryLabels } from "@/lib/utils";
import { siteUrl } from "@/lib/site";

export const revalidate = 3600;
/** New slugs added in the CMS are rendered on first request, then cached. */
export const dynamicParams = true;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Project not found" };
  const description = project.seoDescription ?? project.summary;
  return {
    title: project.title,
    description,
    alternates: { canonical: `/projects/${slug}` },
    openGraph: {
      type: "article",
      url: `/projects/${slug}`,
      title: project.title,
      description,
      images: project.cover ? [{ url: project.cover.url, alt: project.cover.alt }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description,
      images: project.cover ? [project.cover.url] : undefined,
    },
  };
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.summary,
    genre: categoryLabels[project.category],
    dateCreated: project.startedAt ?? undefined,
    url: `${siteUrl}/projects/${project.slug}`,
    image: project.cover ? new URL(project.cover.url, siteUrl).toString() : undefined,
    keywords: project.technologies.map((t) => t.name).join(", "),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ProjectDetailView project={project} />
    </>
  );
}
