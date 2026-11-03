import { z } from "zod";
import type { ProjectBlock } from "@portfolio/shared";
import { isHttpUrl, optText, uuid } from "../../common/validate";
import { sanitizeRichText } from "../../lib/sanitize";
import type { MediaMap } from "../media/media.mapper";

/**
 * Case-study blocks (rancangan §9.3).
 *
 * Storage format (project_blocks.data) — media is stored by id, keys are camelCase:
 *   rich_text     { html }
 *   image         { mediaId, caption?, frame? }
 *   gallery       { items: [{ mediaId, caption? }], columns? }
 *   before_after  { beforeMediaId, afterMediaId, caption? }
 *   metrics       { items: [{ value, label }] }
 *   quote         { text, author? }
 *   embed         { provider, url, title? }
 *   code          { language, code }
 *   list          { style, items }
 *
 * Public format (apps/web `ProjectBlock`) has the ids resolved to `Media` objects: see toPublicBlock().
 */

/** Which hosts may be embedded per provider. Anything else is rejected (the site renders it in an iframe). */
const EMBED_HOSTS = {
  figma: ["figma.com"],
  youtube: ["youtube.com", "youtu.be", "youtube-nocookie.com"],
  tableau: ["tableau.com"],
  looker: ["lookerstudio.google.com", "datastudio.google.com", "looker.com"],
} as const;

export function isAllowedEmbed(provider: keyof typeof EMBED_HOSTS, url: string): boolean {
  if (!isHttpUrl(url)) return false;
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") return false;
  return EMBED_HOSTS[provider].some((d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`));
}

const caption = optText(300);
const heading = optText(160);

export const blockInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("rich_text"),
    heading,
    data: z.object({ html: z.string().max(100_000, "Text is too long.").transform(sanitizeRichText) }),
  }),
  z.object({
    type: z.literal("image"),
    heading,
    data: z.object({ mediaId: uuid, caption, frame: z.enum(["browser", "device", "none"]).default("browser") }),
  }),
  z.object({
    type: z.literal("gallery"),
    heading,
    data: z.object({
      items: z.array(z.object({ mediaId: uuid, caption })).min(1).max(24),
      columns: z.union([z.literal(2), z.literal(3)]).default(2),
    }),
  }),
  z.object({
    type: z.literal("before_after"),
    heading,
    data: z.object({ beforeMediaId: uuid, afterMediaId: uuid, caption }),
  }),
  z.object({
    type: z.literal("metrics"),
    heading,
    data: z.object({
      items: z
        .array(z.object({ value: z.string().trim().min(1).max(20), label: z.string().trim().min(1).max(80) }))
        .min(1)
        .max(8),
    }),
  }),
  z.object({
    type: z.literal("quote"),
    heading,
    data: z.object({ text: z.string().trim().min(1).max(1000), author: optText(120) }),
  }),
  z.object({
    type: z.literal("embed"),
    heading,
    data: z.object({
      provider: z.enum(["figma", "tableau", "looker", "youtube"]),
      url: z.string().trim().max(2048),
      title: optText(120),
    }),
  }),
  z.object({
    type: z.literal("code"),
    heading,
    data: z.object({
      language: z.string().trim().min(1).max(30).regex(/^[\w+#.-]+$/, "Letters, digits and + # . - only."),
      code: z.string().min(1).max(20_000),
    }),
  }),
  z.object({
    type: z.literal("list"),
    heading,
    data: z.object({
      style: z.enum(["bullet", "numbered"]).default("bullet"),
      items: z.array(z.string().trim().min(1).max(300)).min(1).max(50),
    }),
  }),
]).superRefine((block, ctx) => {
  // z.discriminatedUnion only accepts plain objects, so cross-field rules live here.
  if (block.type === "embed" && !isAllowedEmbed(block.data.provider, block.data.url)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["data", "url"],
      message: `Must be an https:// link on a ${block.data.provider} domain.`,
    });
  }
});

export type BlockInput = z.output<typeof blockInput>;

/** Every media id a block points at (to check existence on save). */
export function collectMediaIds(block: BlockInput): string[] {
  switch (block.type) {
    case "image":
      return [block.data.mediaId];
    case "gallery":
      return block.data.items.map((i) => i.mediaId);
    case "before_after":
      return [block.data.beforeMediaId, block.data.afterMediaId];
    default:
      return [];
  }
}

interface StoredBlock {
  id: string;
  type: ProjectBlock["type"];
  heading: string | null;
  data: Record<string, unknown>;
}

const opt = <K extends string>(key: K, value: string | null | undefined) => (value ? { [key]: value } : {}) as Partial<Record<K, string>>;

/** Maps a stored row to the shape the website expects. Returns null if a referenced image no longer exists. */
export function toPublicBlock(row: StoredBlock, media: MediaMap): ProjectBlock | null {
  const base = { id: row.id, heading: row.heading };
  // Stored data was validated by `blockInput` when it was saved, so the casts below are safe.
  const d = row.data as never as Record<string, any>;
  switch (row.type) {
    case "rich_text":
      return { ...base, type: "rich_text", data: { html: d.html } };
    case "image": {
      const m = media.get(d.mediaId);
      return m ? { ...base, type: "image", data: { media: m, ...opt("caption", d.caption), frame: d.frame } } : null;
    }
    case "gallery": {
      const items = (d.items as Array<{ mediaId: string; caption?: string | null }>).flatMap((i) => {
        const m = media.get(i.mediaId);
        return m ? [{ media: m, ...opt("caption", i.caption) }] : [];
      });
      return items.length ? { ...base, type: "gallery", data: { items, columns: d.columns } } : null;
    }
    case "before_after": {
      const before = media.get(d.beforeMediaId);
      const after = media.get(d.afterMediaId);
      return before && after
        ? { ...base, type: "before_after", data: { before, after, ...opt("caption", d.caption) } }
        : null;
    }
    case "metrics":
      return { ...base, type: "metrics", data: { items: d.items } };
    case "quote":
      return { ...base, type: "quote", data: { text: d.text, ...opt("author", d.author) } };
    case "embed":
      return { ...base, type: "embed", data: { provider: d.provider, url: d.url, ...opt("title", d.title) } };
    case "code":
      return { ...base, type: "code", data: { language: d.language, code: d.code } };
    case "list":
      return { ...base, type: "list", data: { style: d.style, items: d.items } };
  }
}

/** Every media id referenced by already-stored blocks (to resolve them in one query). */
export function storedMediaIds(rows: StoredBlock[]): string[] {
  const ids: string[] = [];
  for (const r of rows) {
    const d = r.data as Record<string, any>;
    if (r.type === "image") ids.push(d.mediaId);
    else if (r.type === "gallery") ids.push(...d.items.map((i: { mediaId: string }) => i.mediaId));
    else if (r.type === "before_after") ids.push(d.beforeMediaId, d.afterMediaId);
  }
  return ids;
}
