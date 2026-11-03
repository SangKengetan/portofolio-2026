import type { Profile } from "@portfolio/shared";
import { notFound, validationError } from "../../common/errors";
import type { TtlCache } from "../../lib/cache";
import type { MediaUrlBuilder } from "../../lib/media-url";
import type { ContentPublisher } from "../../lib/publisher";
import type { MediaLookup } from "../media/media.mapper";
import type { MediaRepository } from "../media/media.repository";
import type { ProfileRepository, ProfileRow, ProfileValues } from "./profile.repository";
import type { ProfileBody } from "./profile.schema";

export class ProfileService {
  constructor(
    private readonly repo: ProfileRepository,
    private readonly mediaRepo: MediaRepository,
    private readonly mediaLookup: MediaLookup,
    private readonly mediaUrl: MediaUrlBuilder,
    private readonly publisher: ContentPublisher,
    private readonly cache: TtlCache,
  ) {}

  getPublic(): Promise<Profile> {
    return this.cache.wrap("profile", async () => {
      const row = await this.repo.get();
      if (!row) throw notFound("Profile", "PROFILE_NOT_SET");
      return this.toProfile(row);
    });
  }

  async getAdmin() {
    const row = await this.repo.get();
    if (!row) throw notFound("Profile", "PROFILE_NOT_SET");
    return this.toAdmin(row);
  }

  async update(body: ProfileBody) {
    await this.assertReferences(body);
    const socials = Object.fromEntries(Object.entries(body.socials).filter(([, v]) => !!v)) as Record<string, string>;
    const values: ProfileValues = { ...body, socials };
    const row = await this.repo.upsert(values);
    this.publisher.changed("profile");
    return this.toAdmin(row);
  }

  private async toProfile(row: ProfileRow): Promise<Profile> {
    const media = await this.mediaLookup.load([row.photoMediaId, row.cvMediaId]);
    const cv = media.getRow(row.cvMediaId);
    return {
      fullName: row.fullName,
      shortName: row.shortName,
      roles: row.roles,
      headline: row.headline ?? "",
      statement: row.statement ?? "",
      bio: row.bio ?? "",
      location: row.location ?? "",
      timezone: row.timezone,
      email: row.email ?? "",
      ...(row.phone ? { phone: row.phone } : {}),
      handle: row.handle ?? "",
      availableForWork: row.availableForWork,
      socials: row.socials,
      photo: media.get(row.photoMediaId),
      cvUrl: cv ? this.mediaUrl(cv.filePath) : null,
      ...(row.seoTitle ? { seoTitle: row.seoTitle } : {}),
      ...(row.seoDescription ? { seoDescription: row.seoDescription } : {}),
    };
  }

  private async toAdmin(row: ProfileRow) {
    return {
      ...(await this.toProfile(row)),
      // Editable fields as they are stored (null instead of "" so the form can tell "empty" apart).
      headline: row.headline,
      statement: row.statement,
      bio: row.bio,
      location: row.location,
      email: row.email,
      phone: row.phone,
      handle: row.handle,
      photoMediaId: row.photoMediaId,
      cvMediaId: row.cvMediaId,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async assertReferences(body: ProfileBody) {
    const ids = [body.photoMediaId, body.cvMediaId].filter((x): x is string => !!x);
    if (!ids.length) return;
    const found = await this.mediaRepo.findManyByIds(ids);
    const fields: Record<string, string> = {};
    if (body.photoMediaId) {
      const row = found.get(body.photoMediaId);
      if (!row) fields.photoMediaId = "Media not found.";
      else if (!row.mimeType.startsWith("image/")) fields.photoMediaId = "This file is not an image.";
    }
    if (body.cvMediaId) {
      const row = found.get(body.cvMediaId);
      if (!row) fields.cvMediaId = "Media not found.";
      else if (row.mimeType !== "application/pdf") fields.cvMediaId = "The CV must be a PDF file.";
    }
    if (Object.keys(fields).length) throw validationError(fields);
  }
}
