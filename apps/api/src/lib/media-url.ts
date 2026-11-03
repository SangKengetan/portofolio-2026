/**
 * Turns a stored `media.file_path` into the URL sent to clients.
 *  - "/uploads/…"      → absolute URL on the media host (what next/image's remotePatterns expects)
 *  - anything else     → returned unchanged (e.g. "/placeholders/…" used by the demo seed, served by Next.js)
 */
export function createMediaUrlBuilder(publicBase: string) {
  const base = publicBase.replace(/\/$/, "");
  return (filePath: string): string => (filePath.startsWith("/uploads/") ? `${base}${filePath}` : filePath);
}

export type MediaUrlBuilder = ReturnType<typeof createMediaUrlBuilder>;
