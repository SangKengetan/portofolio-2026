/** "Clinic Queue System!" → "clinic-queue-system". Falls back to "item" for input without letters/digits. */
export function slugify(input: string, maxLength = 100): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return slug || "item";
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Returns `base`, `base-2`, `base-3`, … — the first one for which `exists` is false.
 */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  let candidate = base;
  for (let i = 2; await exists(candidate); i++) {
    candidate = `${base}-${i}`;
    if (i > 200) throw new Error("Could not generate a unique slug");
  }
  return candidate;
}
