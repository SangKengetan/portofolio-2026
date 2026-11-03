import type { Certificate, Media } from "@portfolio/shared";
import type { CertificateRow } from "./certificates.repository";

export const toCertificate = (r: CertificateRow, image: Media | null, issuerLogo: Media | null): Certificate => ({
  id: r.id,
  title: r.title,
  issuer: r.issuer,
  category: r.category,
  issuedAt: r.issuedAt,
  expiresAt: r.expiresAt,
  credentialId: r.credentialId,
  credentialUrl: r.credentialUrl,
  image,
  issuerLogo,
  isFeatured: r.isFeatured,
});

export const toAdminCertificate = (r: CertificateRow, image: Media | null, issuerLogo: Media | null) => ({
  ...toCertificate(r, image, issuerLogo),
  imageMediaId: r.imageMediaId,
  issuerLogoMediaId: r.issuerLogoMediaId,
  status: r.status,
  sortOrder: r.sortOrder,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});
