/**
 * Case-study blocks in the editor: empty factories, category templates (rancangan §5.3),
 * client-side checks that mirror apps/api/src/modules/projects/blocks.ts, and conversion to the API body.
 */
import type { BlockType, ProjectCategory } from "@portfolio/shared";
import type { IconName } from "@/components/ui/Icon";
import type { StoredBlock } from "./types";

/** A block while editing: `key` is a stable client id; media ids are "" until chosen. */
export type EditorBlock = StoredBlock & { key: string };

export const blockTypes: Array<{ type: BlockType; label: string; description: string; icon: IconName }> = [
  { type: "rich_text", label: "Text", description: "Paragraphs, headings, lists and links", icon: "type" },
  { type: "image", label: "Image", description: "One screenshot in a browser or device frame", icon: "image" },
  { type: "gallery", label: "Gallery", description: "Several images in 2 or 3 columns", icon: "grid" },
  { type: "before_after", label: "Before / after", description: "Two images side by side (e.g. wireframe → hi-fi)", icon: "columns" },
  { type: "metrics", label: "Metrics", description: "Big numbers with labels", icon: "bar-chart" },
  { type: "quote", label: "Quote", description: "Testimonial or user quote", icon: "quote" },
  { type: "embed", label: "Embed", description: "Figma, Tableau, Looker Studio or YouTube", icon: "window" },
  { type: "code", label: "Code", description: "SQL, Python or any snippet", icon: "code" },
  { type: "list", label: "List", description: "Bulleted or numbered points", icon: "list" },
];

export const blockLabel = (type: BlockType) => blockTypes.find((b) => b.type === type)?.label ?? type;

let counter = 0;
export const newKey = () => `new-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function emptyBlock(type: BlockType, heading = ""): EditorBlock {
  const base = { key: newKey(), id: "", heading };
  switch (type) {
    case "rich_text":
      return { ...base, type, data: { html: "" } };
    case "image":
      return { ...base, type, data: { mediaId: "", caption: "", frame: "browser" } };
    case "gallery":
      return { ...base, type, data: { items: [], columns: 2 } };
    case "before_after":
      return { ...base, type, data: { beforeMediaId: "", afterMediaId: "", caption: "" } };
    case "metrics":
      return { ...base, type, data: { items: [{ value: "", label: "" }] } };
    case "quote":
      return { ...base, type, data: { text: "", author: "" } };
    case "embed":
      return { ...base, type, data: { provider: "figma", url: "", title: "" } };
    case "code":
      return { ...base, type, data: { language: "sql", code: "" } };
    case "list":
      return { ...base, type, data: { style: "bullet", items: [""] } };
  }
}

/** Default case-study outline per category (rancangan §5.3). */
export const templates: Record<ProjectCategory, Array<[BlockType, string]>> = {
  web: [
    ["rich_text", "Overview & problem"],
    ["gallery", "Key features"],
    ["list", "Architecture & tech stack"],
    ["rich_text", "Technical challenges & solutions"],
    ["metrics", "Results & impact"],
    ["rich_text", "Lessons learned"],
  ],
  uiux: [
    ["rich_text", "Problem statement"],
    ["list", "User research & insight"],
    ["quote", "User persona / journey"],
    ["before_after", "Wireframe → hi-fi"],
    ["embed", "Prototype"],
    ["metrics", "Usability test & iteration"],
    ["rich_text", "Results & lessons"],
  ],
  data: [
    ["rich_text", "Business question"],
    ["list", "Dataset & sources"],
    ["code", "Process: cleaning → EDA → modelling"],
    ["image", "Key visualisation"],
    ["list", "Insights & recommendations"],
    ["metrics", "Impact"],
  ],
};

export const templateBlocks = (category: ProjectCategory): EditorBlock[] =>
  templates[category].map(([type, heading]) => emptyBlock(type, heading));

export const fromStored = (blocks: Array<StoredBlock & { sortOrder?: number }>): EditorBlock[] =>
  blocks.map((b) => {
    const { sortOrder: _s, ...rest } = b as StoredBlock & { sortOrder?: number };
    return { ...(rest as StoredBlock), key: b.id || newKey() } as EditorBlock;
  });

/* ---------- validation (same rules as the API, same dotted keys) ---------- */
const EMBED_HOSTS: Record<string, string[]> = {
  figma: ["figma.com"],
  youtube: ["youtube.com", "youtu.be", "youtube-nocookie.com"],
  tableau: ["tableau.com"],
  looker: ["lookerstudio.google.com", "datastudio.google.com", "looker.com"],
};

export function isAllowedEmbed(provider: string, url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (EMBED_HOSTS[provider] ?? []).some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export function validateBlocks(blocks: EditorBlock[]): Record<string, string> {
  const e: Record<string, string> = {};
  blocks.forEach((b, i) => {
    const p = `blocks.${i}.data`;
    switch (b.type) {
      case "rich_text":
        if (!b.data.html.replace(/<[^>]+>/g, "").trim()) e[`${p}.html`] = "Write some text or remove this block.";
        break;
      case "image":
        if (!b.data.mediaId) e[`${p}.mediaId`] = "Choose an image.";
        break;
      case "gallery":
        if (b.data.items.length === 0) e[`${p}.items`] = "Add at least one image.";
        b.data.items.forEach((it, j) => {
          if (!it.mediaId) e[`${p}.items.${j}.mediaId`] = "Choose an image.";
        });
        break;
      case "before_after":
        if (!b.data.beforeMediaId) e[`${p}.beforeMediaId`] = "Choose the “before” image.";
        if (!b.data.afterMediaId) e[`${p}.afterMediaId`] = "Choose the “after” image.";
        break;
      case "metrics":
        if (b.data.items.length === 0) e[`${p}.items`] = "Add at least one metric.";
        b.data.items.forEach((m, j) => {
          if (!m.value.trim()) e[`${p}.items.${j}.value`] = "Required.";
          if (!m.label.trim()) e[`${p}.items.${j}.label`] = "Required.";
        });
        break;
      case "quote":
        if (!b.data.text.trim()) e[`${p}.text`] = "Write the quote.";
        break;
      case "embed":
        if (!isAllowedEmbed(b.data.provider, b.data.url.trim())) e[`${p}.url`] = `Must be an https:// link on a ${b.data.provider} domain.`;
        break;
      case "code":
        if (!/^[\w+#.-]+$/.test(b.data.language.trim())) e[`${p}.language`] = "Letters, digits and + # . - only.";
        if (!b.data.code.trim()) e[`${p}.code`] = "Paste some code.";
        break;
      case "list":
        if (b.data.items.filter((x) => x.trim()).length === 0) e[`${p}.items`] = "Add at least one item.";
        break;
    }
  });
  return e;
}

const textOrNull = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

/** Body for PUT /admin/projects/:id/blocks. */
export function toApiBlocks(blocks: EditorBlock[]) {
  return blocks.map((b) => {
    const heading = textOrNull(b.heading);
    switch (b.type) {
      case "rich_text":
        return { type: b.type, heading, data: { html: b.data.html } };
      case "image":
        return { type: b.type, heading, data: { mediaId: b.data.mediaId, caption: textOrNull(b.data.caption), frame: b.data.frame ?? "browser" } };
      case "gallery":
        return {
          type: b.type,
          heading,
          data: { items: b.data.items.map((it) => ({ mediaId: it.mediaId, caption: textOrNull(it.caption) })), columns: b.data.columns ?? 2 },
        };
      case "before_after":
        return { type: b.type, heading, data: { beforeMediaId: b.data.beforeMediaId, afterMediaId: b.data.afterMediaId, caption: textOrNull(b.data.caption) } };
      case "metrics":
        return { type: b.type, heading, data: { items: b.data.items.map((m) => ({ value: m.value.trim(), label: m.label.trim() })) } };
      case "quote":
        return { type: b.type, heading, data: { text: b.data.text.trim(), author: textOrNull(b.data.author) } };
      case "embed":
        return { type: b.type, heading, data: { provider: b.data.provider, url: b.data.url.trim(), title: textOrNull(b.data.title) } };
      case "code":
        return { type: b.type, heading, data: { language: b.data.language.trim(), code: b.data.code } };
      case "list":
        return { type: b.type, heading, data: { style: b.data.style, items: b.data.items.map((x) => x.trim()).filter(Boolean) } };
    }
  });
}
