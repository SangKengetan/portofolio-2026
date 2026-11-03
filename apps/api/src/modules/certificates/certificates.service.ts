import type { Certificate } from "@portfolio/shared";
import { notFound, validationError } from "../../common/errors";
import type { TtlCache } from "../../lib/cache";
import type { ContentPublisher } from "../../lib/publisher";
import type { MediaLookup } from "../media/media.mapper";
import type { MediaRepository } from "../media/media.repository";
import { toAdminCertificate, toCertificate } from "./certificates.mapper";
import type { CertificateFilters, CertificateRow, CertificateValues, CertificatesRepository } from "./certificates.repository";
import type { CertificateBody } from "./certificates.schema";

export class CertificatesService {
  constructor(
    private readonly repo: CertificatesRepository,
    private readonly mediaRepo: MediaRepository,
    private readonly mediaLookup: MediaLookup,
    private readonly publisher: ContentPublisher,
    private readonly cache: TtlCache,
    private readonly now: () => Date = () => new Date(),
  ) {}

  listPublic(f: Pick<CertificateFilters, "page" | "limit" | "category" | "featured">): Promise<{ items: Certificate[]; total: number }> {
    return this.cache.wrap(`certificates:${JSON.stringify(f)}`, async () => {
      const { rows, total } = await this.repo.list({ ...f, publishedOnly: true });
      const media = await this.mediaLookup.load(rows.flatMap((r) => [r.imageMediaId, r.issuerLogoMediaId]));
      return { items: rows.map((r) => toCertificate(r, media.get(r.imageMediaId), media.get(r.issuerLogoMediaId))), total };
    });
  }

  async listAdmin(f: CertificateFilters) {
    const { rows, total } = await this.repo.list(f);
    const media = await this.mediaLookup.load(rows.flatMap((r) => [r.imageMediaId, r.issuerLogoMediaId]));
    return { items: rows.map((r) => toAdminCertificate(r, media.get(r.imageMediaId), media.get(r.issuerLogoMediaId))), total };
  }

  async get(id: string) {
    const row = await this.repo.findById(id);
    if (!row) throw notFound("Certificate");
    return this.detail(row);
  }

  async create(body: CertificateBody) {
    await this.assertImages(body);
    const row = await this.repo.create(this.values(body));
    this.publisher.changed("certificates");
    return this.detail(row);
  }

  async update(id: string, body: CertificateBody) {
    await this.assertImages(body);
    const row = await this.repo.update(id, this.values(body));
    if (!row) throw notFound("Certificate");
    this.publisher.changed("certificates");
    return this.detail(row);
  }

  async remove(id: string) {
    if (!(await this.repo.softDelete(id, this.now()))) throw notFound("Certificate");
    this.publisher.changed("certificates");
  }

  async reorder(items: Array<{ id: string; sortOrder: number }>) {
    await this.repo.reorder(items);
    this.publisher.changed("certificates");
  }

  private async detail(row: CertificateRow) {
    const media = await this.mediaLookup.load([row.imageMediaId, row.issuerLogoMediaId]);
    return toAdminCertificate(row, media.get(row.imageMediaId), media.get(row.issuerLogoMediaId));
  }

  private values(b: CertificateBody): CertificateValues {
    return {
      title: b.title,
      issuer: b.issuer,
      category: b.category,
      issuedAt: b.issuedAt,
      expiresAt: b.expiresAt,
      credentialId: b.credentialId,
      credentialUrl: b.credentialUrl,
      imageMediaId: b.imageMediaId,
      issuerLogoMediaId: b.issuerLogoMediaId,
      isFeatured: b.isFeatured,
      status: b.status,
      sortOrder: b.sortOrder,
    };
  }

  private async assertImages(b: CertificateBody) {
    const refs = [
      ["imageMediaId", b.imageMediaId],
      ["issuerLogoMediaId", b.issuerLogoMediaId],
    ] as const;
    const ids = refs.flatMap(([, id]) => (id ? [id] : []));
    if (!ids.length) return;
    const found = await this.mediaRepo.findManyByIds(ids);
    const fields: Record<string, string> = {};
    for (const [field, id] of refs) {
      if (!id) continue;
      const row = found.get(id);
      if (!row) fields[field] = "Media not found.";
      else if (!row.mimeType.startsWith("image/")) fields[field] = "This file is not an image.";
    }
    if (Object.keys(fields).length) throw validationError(fields);
  }
}
