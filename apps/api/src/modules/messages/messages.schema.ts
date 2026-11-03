import { z } from "zod";
import { boolQuery, paginationQuery } from "../../common/pagination";
import { uuid } from "../../common/validate";

export const messagesQuery = paginationQuery(20, 100).extend({
  isRead: boolQuery.optional(),
  search: z.string().trim().max(100).optional(),
});
export const idParams = z.object({ id: uuid });
export const readBody = z.object({ isRead: z.boolean() });
