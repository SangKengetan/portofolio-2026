import { z } from "zod";
import { optText, uuid } from "../../common/validate";
import { paginationQuery } from "../../common/pagination";

export const mediaIdParams = z.object({ id: uuid });

export const uploadBody = z.object({ altText: optText(255) });

export const updateMediaBody = z.object({ altText: optText(255) });

export const mediaListQuery = paginationQuery(24, 100).extend({
  search: z.string().trim().max(100).optional(),
  kind: z.enum(["image", "pdf"]).optional(),
});
