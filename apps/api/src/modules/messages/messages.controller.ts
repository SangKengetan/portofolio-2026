import type { Request, Response } from "express";
import { deleted, ok } from "../../common/http";
import { toMeta } from "../../common/pagination";
import { parse } from "../../common/validate";
import type { MessagesService } from "./messages.service";
import { idParams, messagesQuery, readBody } from "./messages.schema";

export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  list = async (req: Request, res: Response) => {
    const q = parse(messagesQuery, req.query);
    const { items, total, unread } = await this.service.list(q);
    // `unread` powers the badge in the admin sidebar.
    res.setHeader("X-Unread-Count", String(unread));
    ok(res, items, { meta: toMeta(q.page, q.limit, total) });
  };

  get = async (req: Request, res: Response) => ok(res, await this.service.get(parse(idParams, req.params).id));

  setRead = async (req: Request, res: Response) => {
    const { id } = parse(idParams, req.params);
    const { isRead } = parse(readBody, req.body);
    ok(res, await this.service.setRead(id, isRead), { message: isRead ? "Marked as read." : "Marked as unread." });
  };

  remove = async (req: Request, res: Response) => {
    await this.service.remove(parse(idParams, req.params).id);
    deleted(res, "Message deleted.");
  };
}
