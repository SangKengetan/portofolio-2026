import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { conflict, notFound, payloadTooLarge, unsupportedMedia, validationError } from "../../common/errors";
import type { ContentPublisher } from "../../lib/publisher";
import { processImage } from "../../lib/image";
import type { MediaUrlBuilder } from "../../lib/media-url";
import type { Storage } from "../../lib/storage";
import { toAdminMedia } from "./media.mapper";
import type { MediaListFilters, MediaRepository } from "./media.repository";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const PDF_TYPE = "application/pdf";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_PDF_BYTES = 5 * 1024 * 1024;

export interface UploadedFile {
  buffer: Buffer;
  size: number;
}

export class MediaService {
  constructor(
    private readonly repo: MediaRepository,
    private readonly storage: Storage,
    private readonly url: MediaUrlBuilder,
    private readonly publisher: ContentPublisher,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async upload(file: UploadedFile, altText: string | null) {
    // The type comes from the file's magic bytes — the client-supplied name/MIME header is never trusted.
    const detected = await fileTypeFromBuffer(file.buffer);
    const mime = detected?.mime;
    if (!mime || (!IMAGE_TYPES.has(mime) && mime !== PDF_TYPE)) {
      throw unsupportedMedia("Only JPG, PNG, WebP, GIF images and PDF files are accepted.");
    }

    const id = randomUUID();
    const d = this.now();
    const folder = `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const rel = (name: string) => `${folder}/${name}`;
    const publicPath = (relative: string) => `/uploads/${relative}`;

    if (mime === PDF_TYPE) {
      if (file.size > MAX_PDF_BYTES) throw payloadTooLarge("PDF files can be at most 5 MB.");
      const relative = rel(`${id}.pdf`);
      await this.storage.save(relative, file.buffer);
      return this.persist([relative], () =>
        this.repo.insert({
          id,
          filePath: publicPath(relative),
          mimeType: PDF_TYPE,
          sizeBytes: file.size,
          altText,
          variants: JSON.stringify({}),
        }),
      );
    }

    if (!altText) throw validationError({ altText: "Alt text is required for images." });
    if (file.size > MAX_IMAGE_BYTES) throw payloadTooLarge("Images can be at most 8 MB.");

    let variants;
    try {
      variants = await processImage(file.buffer, mime === "image/gif");
    } catch {
      throw unsupportedMedia("This image could not be read. It may be corrupt or too large.");
    }

    const lg = variants.find((v) => v.name === "lg")!;
    const names = { lg: rel(`${id}.webp`), md: rel(`${id}-md.webp`), sm: rel(`${id}-sm.webp`) } as const;
    const written: string[] = [];
    try {
      for (const v of variants) {
        await this.storage.save(names[v.name], v.buffer);
        written.push(names[v.name]);
      }
    } catch (err) {
      await this.removeAll(written);
      throw err;
    }

    return this.persist(written, () =>
      this.repo.insert({
        id,
        filePath: publicPath(names.lg),
        mimeType: "image/webp",
        sizeBytes: lg.buffer.length,
        width: lg.width,
        height: lg.height,
        altText,
        variants: JSON.stringify({
          sm: publicPath(names.sm),
          md: publicPath(names.md),
          lg: publicPath(names.lg),
        }),
      }),
    );
  }

  async list(filters: MediaListFilters) {
    const { rows, total } = await this.repo.list(filters);
    return { items: rows.map((r) => toAdminMedia(r, this.url)), total };
  }

  async get(id: string) {
    const row = await this.repo.findById(id);
    if (!row) throw notFound("Media");
    return toAdminMedia(row, this.url);
  }

  async updateAlt(id: string, altText: string | null) {
    const existing = await this.repo.findById(id);
    if (!existing) throw notFound("Media");
    if (existing.mimeType.startsWith("image/") && !altText) {
      throw validationError({ altText: "Alt text is required for images." });
    }
    const row = await this.repo.updateAlt(id, altText);
    this.publisher.changed("media");
    return toAdminMedia(row!, this.url);
  }

  async remove(id: string): Promise<void> {
    const row = await this.repo.findById(id);
    if (!row) throw notFound("Media");
    if ((await this.repo.usageCount(id)) > 0) {
      throw conflict("This file is still used by other content. Remove it there first.", "MEDIA_IN_USE");
    }
    await this.repo.delete(id);
    const paths = new Set([row.filePath, ...Object.values(row.variants)]);
    await this.removeAll([...paths].map((p) => p.replace(/^\/uploads\//, "")));
  }

  /** Inserts the row; if that fails the already-written files are deleted so nothing is orphaned. */
  private async persist(written: string[], insert: () => Promise<Parameters<typeof toAdminMedia>[0]>) {
    try {
      return toAdminMedia(await insert(), this.url);
    } catch (err) {
      await this.removeAll(written);
      throw err;
    }
  }

  private async removeAll(relativePaths: string[]) {
    await Promise.allSettled(relativePaths.map((p) => this.storage.remove(p)));
  }
}
