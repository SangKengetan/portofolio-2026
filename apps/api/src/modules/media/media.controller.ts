import type { Request, Response } from "express";
import { badRequest } from "../../common/errors";
import { created, deleted, ok } from "../../common/http";
import { toMeta } from "../../common/pagination";
import { parse } from "../../common/validate";
import type { MediaService } from "./media.service";
import { mediaIdParams, mediaListQuery, updateMediaBody, uploadBody } from "./media.schema";

export class MediaController {
  constructor(private readonly service: MediaService) {}

  upload = async (req: Request, res: Response) => {
    if (!req.file) throw badRequest('Send the file as multipart/form-data in the field "file".', "FILE_REQUIRED");
    const body = parse(uploadBody, req.body ?? {});
    const media = await this.service.upload({ buffer: req.file.buffer, size: req.file.size }, body.altText);
    created(res, media, "File uploaded.");
  };

  list = async (req: Request, res: Response) => {
    const q = parse(mediaListQuery, req.query);
    const { items, total } = await this.service.list(q);
    ok(res, items, { meta: toMeta(q.page, q.limit, total) });
  };

  get = async (req: Request, res: Response) => {
    const { id } = parse(mediaIdParams, req.params);
    ok(res, await this.service.get(id));
  };

  update = async (req: Request, res: Response) => {
    const { id } = parse(mediaIdParams, req.params);
    const body = parse(updateMediaBody, req.body);
    ok(res, await this.service.updateAlt(id, body.altText), { message: "Media updated." });
  };

  remove = async (req: Request, res: Response) => {
    const { id } = parse(mediaIdParams, req.params);
    await this.service.remove(id);
    deleted(res, "Media deleted.");
  };
}
