import { z } from "zod";

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** `?page=&limit=` — every list endpoint supports it; defaults return a full first page. */
export const paginationQuery = (defaultLimit = 50, maxLimit = 100) =>
  z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit),
  });

export const toMeta = (page: number, limit: number, total: number): PageMeta => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

export const toOffset = (page: number, limit: number) => (page - 1) * limit;

/** `?featured=true|false` */
export const boolQuery = z.enum(["true", "false"]).transform((v) => v === "true");

/** Escape `%`, `_` and `\` so user input is matched literally by ILIKE. */
export const likePattern = (term: string) => `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
