import { z } from "zod";
import { boolQuery, paginationQuery } from "../../common/pagination";
import { isoDate, optDate, optText, optUrl, optUuid, sortOrderField, uuid } from "../../common/validate";
import { statusSchema } from "../projects/projects.schema";

export const certificateCategorySchema = z.enum(["web", "uiux", "data", "other"]);

export const publicCertificatesQuery = paginationQuery(100, 200).extend({
  category: certificateCategorySchema.optional(),
  featured: boolQuery.optional(),
});

export const adminCertificatesQuery = paginationQuery(20, 100).extend({
  category: certificateCategorySchema.optional(),
  status: statusSchema.optional(),
  search: z.string().trim().max(100).optional(),
});

export const idParams = z.object({ id: uuid });

export const certificateBody = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(200),
    issuer: z.string().trim().min(1, "Issuer is required.").max(160),
    category: certificateCategorySchema.default("other"),
    issuedAt: isoDate,
    expiresAt: optDate,
    credentialId: optText(160),
    credentialUrl: optUrl,
    imageMediaId: optUuid,
    issuerLogoMediaId: optUuid,
    isFeatured: z.boolean().default(false),
    status: statusSchema.default("published"),
    sortOrder: sortOrderField.default(0),
  })
  .refine((v) => !v.expiresAt || v.expiresAt >= v.issuedAt, {
    path: ["expiresAt"],
    message: "Expiry date cannot be before the issue date.",
  });
export type CertificateBody = z.output<typeof certificateBody>;
