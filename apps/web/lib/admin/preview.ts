/**
 * Builds the public `ProjectDetail` shape from the editor's (possibly unsaved) values, so the
 * admin can preview the case study with the real website components before publishing.
 */
import type { Media, ProjectBlock, ProjectCategory, ProjectDetail, ProjectMetric, Technology } from "@portfolio/shared";
import type { EditorBlock } from "./blocks";
import { loadMedia, type MediaPreview } from "./media-cache";

export interface PreviewInput {
  id: string;
  slug: string;
  title: string;
  category: ProjectCategory;
  summary: string;
  impactLine: string;
  impactStatement: string;
  role: string;
  team: string;
  client: string;
  year: string;
  startedAt: string;
  endedAt: string;
  contributions: string[];
  coverMediaId: string | null;
  demoUrl: string;
  repoUrl: string;
  figmaUrl: string;
  dashboardUrl: string;
  notebookUrl: string;
  metrics: ProjectMetric[];
  blocks: EditorBlock[];
  technologies: Technology[];
  isFeatured: boolean;
}

const toMedia = (m: MediaPreview | null): Media | null =>
  m ? { id: m.id, url: m.url, alt: m.alt, ...(m.width ? { width: m.width } : {}), ...(m.height ? { height: m.height } : {}) } : null;

const s = (v: string) => (v.trim() ? v.trim() : null);

export async function buildPreview(v: PreviewInput): Promise<ProjectDetail> {
  const get = async (id: string | null | undefined) => (id ? toMedia(await loadMedia(id)) : null);

  const blocks: ProjectBlock[] = [];
  for (const b of v.blocks) {
    const base = { id: b.key, heading: s(b.heading ?? "") };
    switch (b.type) {
      case "image": {
        const media = await get(b.data.mediaId);
        if (media) blocks.push({ ...base, type: "image", data: { media, caption: b.data.caption || undefined, frame: b.data.frame } });
        break;
      }
      case "gallery": {
        const items = [];
        for (const it of b.data.items) {
          const media = await get(it.mediaId);
          if (media) items.push({ media, caption: it.caption || undefined });
        }
        if (items.length) blocks.push({ ...base, type: "gallery", data: { items, columns: b.data.columns } });
        break;
      }
      case "before_after": {
        const [before, after] = await Promise.all([get(b.data.beforeMediaId), get(b.data.afterMediaId)]);
        if (before && after) blocks.push({ ...base, type: "before_after", data: { before, after, caption: b.data.caption || undefined } });
        break;
      }
      case "rich_text":
        blocks.push({ ...base, type: "rich_text", data: { html: b.data.html } });
        break;
      case "metrics":
        blocks.push({ ...base, type: "metrics", data: { items: b.data.items.filter((m) => m.value && m.label) } });
        break;
      case "quote":
        blocks.push({ ...base, type: "quote", data: { text: b.data.text, author: b.data.author || undefined } });
        break;
      case "embed":
        if (b.data.url) blocks.push({ ...base, type: "embed", data: { provider: b.data.provider, url: b.data.url, title: b.data.title || undefined } });
        break;
      case "code":
        blocks.push({ ...base, type: "code", data: { language: b.data.language, code: b.data.code } });
        break;
      case "list":
        blocks.push({ ...base, type: "list", data: { style: b.data.style, items: b.data.items.filter(Boolean) } });
        break;
    }
  }

  return {
    id: v.id || "preview",
    slug: v.slug || "preview",
    title: v.title || "Untitled project",
    category: v.category,
    summary: v.summary,
    impactLine: s(v.impactLine),
    year: v.year ? Number(v.year) : null,
    cover: await get(v.coverMediaId),
    isFeatured: v.isFeatured,
    publishedAt: new Date().toISOString(),
    impactStatement: s(v.impactStatement),
    role: s(v.role),
    team: s(v.team),
    client: s(v.client),
    startedAt: s(v.startedAt),
    endedAt: s(v.endedAt),
    contributions: v.contributions.filter(Boolean),
    demoUrl: s(v.demoUrl),
    repoUrl: s(v.repoUrl),
    figmaUrl: s(v.figmaUrl),
    dashboardUrl: s(v.dashboardUrl),
    notebookUrl: s(v.notebookUrl),
    metrics: v.metrics.filter((m) => m.value && m.label),
    blocks,
    technologies: v.technologies,
    seoDescription: null,
    nextProject: null,
  };
}
