import type { Media } from "@portfolio/shared";
import type { MediaUrlBuilder } from "../../lib/media-url";
import type { MediaRepository, MediaRow } from "./media.repository";

/** Public shape used inside other resources (profile photo, project cover, block images, …). */
export function toMedia(row: MediaRow, url: MediaUrlBuilder): Media {
  return {
    id: row.id,
    url: url(row.filePath),
    alt: row.altText ?? "",
    ...(row.width ? { width: row.width } : {}),
    ...(row.height ? { height: row.height } : {}),
  };
}

/** Admin media-library shape. */
export function toAdminMedia(row: MediaRow, url: MediaUrlBuilder) {
  return {
    id: row.id,
    url: url(row.filePath),
    filePath: row.filePath,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    altText: row.altText,
    variants: Object.fromEntries(Object.entries(row.variants).map(([k, v]) => [k, url(v)])),
    createdAt: row.createdAt.toISOString(),
  };
}

export interface MediaMap {
  get(id: string | null | undefined): Media | null;
  getRow(id: string | null | undefined): MediaRow | null;
}

/**
 * Resolves many media ids with ONE query (avoids N+1 when a list of projects/certificates is rendered).
 * Usage: `const media = await lookup.load([a.coverMediaId, b.coverMediaId]); media.get(a.coverMediaId)`.
 */
export class MediaLookup {
  constructor(
    private readonly repo: Pick<MediaRepository, "findManyByIds">,
    private readonly url: MediaUrlBuilder,
  ) {}

  async load(ids: Array<string | null | undefined>): Promise<MediaMap> {
    const unique = [...new Set(ids.filter((id): id is string => !!id))];
    const rows = await this.repo.findManyByIds(unique);
    return {
      get: (id) => {
        const row = id ? rows.get(id) : undefined;
        return row ? toMedia(row, this.url) : null;
      },
      getRow: (id) => (id ? (rows.get(id) ?? null) : null),
    };
  }
}
