import type { Media, ProjectBlock, ProjectDetail, ProjectMetric, ProjectSummary } from "@portfolio/shared";
import { toTechnology, toAdminTechnology } from "../technologies/technologies.mapper";
import type { TechnologyRow } from "../technologies/technologies.repository";
import type { BlockRow, MetricRow, ProjectRow } from "./projects.repository";

const publishedIso = (r: ProjectRow) => (r.publishedAt ?? r.createdAt).toISOString();

export const toMetric = (m: MetricRow): ProjectMetric => ({ value: m.value, label: m.label });

export function toSummary(row: ProjectRow, cover: Media | null, techNames: string[]): ProjectSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    summary: row.summary,
    impactLine: row.impactLine,
    year: row.year,
    cover,
    isFeatured: row.isFeatured,
    technologies: techNames,
    publishedAt: publishedIso(row),
  };
}

export function toDetail(
  row: ProjectRow,
  parts: {
    cover: Media | null;
    technologies: TechnologyRow[];
    metrics: MetricRow[];
    blocks: ProjectBlock[];
    next: ProjectSummary | null;
  },
): ProjectDetail {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    summary: row.summary,
    impactLine: row.impactLine,
    year: row.year,
    cover: parts.cover,
    isFeatured: row.isFeatured,
    publishedAt: publishedIso(row),
    impactStatement: row.impactStatement,
    role: row.role,
    team: row.team,
    client: row.client,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    contributions: row.contributions,
    demoUrl: row.demoUrl,
    repoUrl: row.repoUrl,
    figmaUrl: row.figmaUrl,
    dashboardUrl: row.dashboardUrl,
    notebookUrl: row.notebookUrl,
    metrics: parts.metrics.map(toMetric),
    blocks: parts.blocks,
    technologies: parts.technologies.map(toTechnology),
    seoDescription: row.seoDescription,
    nextProject: parts.next,
  };
}

/** Admin shape for one block: media stays as ids so the editor can send the same data back. */
export const toAdminBlock = (b: BlockRow) => ({
  id: b.id,
  type: b.type,
  heading: b.heading,
  data: b.data,
  sortOrder: b.sortOrder,
});

export function toAdminListItem(row: ProjectRow, cover: Media | null, techNames: string[]) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    summary: row.summary,
    status: row.status,
    isFeatured: row.isFeatured,
    sortOrder: row.sortOrder,
    year: row.year,
    cover,
    technologies: techNames,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toAdminDetail(
  row: ProjectRow,
  parts: { cover: Media | null; technologies: TechnologyRow[]; metrics: MetricRow[]; blocks: BlockRow[] },
) {
  return {
    ...toAdminListItem(row, parts.cover, parts.technologies.map((t) => t.name)),
    impactLine: row.impactLine,
    impactStatement: row.impactStatement,
    role: row.role,
    team: row.team,
    client: row.client,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    contributions: row.contributions,
    coverMediaId: row.coverMediaId,
    demoUrl: row.demoUrl,
    repoUrl: row.repoUrl,
    figmaUrl: row.figmaUrl,
    dashboardUrl: row.dashboardUrl,
    notebookUrl: row.notebookUrl,
    meta: row.meta,
    seoDescription: row.seoDescription,
    technologyIds: parts.technologies.map((t) => t.id),
    technologyDetails: parts.technologies.map(toAdminTechnology),
    metrics: parts.metrics.map(toMetric),
    blocks: parts.blocks.map(toAdminBlock),
  };
}
