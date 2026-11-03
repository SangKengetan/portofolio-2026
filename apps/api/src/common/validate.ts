import { z, type ZodTypeAny } from "zod";
import { validationError } from "./errors";

/**
 * Parses `input` with a Zod schema and throws a 422 VALIDATION_ERROR listing the first message per field
 * (dotted path, e.g. "blocks.2.data.mediaId").
 */
export function parse<S extends ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    if (!(key in fields)) fields[key] = issue.message;
  }
  throw validationError(fields);
}

/* ---------- reusable field schemas ---------- */

export const uuid = z.string().uuid("Must be a valid id.");

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD.")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
  }, "Not a valid date.");

export const isHttpUrl = (value: string) => {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

/** Optional text: "", null and undefined all become null. */
export const optText = (max: number) =>
  z.preprocess(blankToNull, z.string().trim().max(max, `Maximum ${max} characters.`).nullish()).transform((v) => v ?? null);

/** Optional http(s) URL: "", null and undefined all become null. */
export const optUrl = z
  .preprocess(
    blankToNull,
    z.string().trim().max(2048, "URL is too long.").refine(isHttpUrl, "Must be a valid http(s) URL.").nullish(),
  )
  .transform((v) => v ?? null);

export const optDate = z.preprocess(blankToNull, isoDate.nullish()).transform((v) => v ?? null);

export const optUuid = z.preprocess(blankToNull, uuid.nullish()).transform((v) => v ?? null);

export const textList = (maxItems: number, maxLen: number) =>
  z
    .array(z.string().trim().min(1, "Must not be empty.").max(maxLen, `Maximum ${maxLen} characters.`))
    .max(maxItems, `Maximum ${maxItems} items.`)
    .default([]);

export const sortOrderField = z.coerce.number().int().min(0).max(100000);

export const reorderBody = z.object({
  items: z
    .array(z.object({ id: z.string().min(1), sortOrder: sortOrderField }))
    .min(1)
    .max(200),
});
