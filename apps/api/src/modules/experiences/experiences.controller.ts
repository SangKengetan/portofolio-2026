import type { Request, Response } from "express";
import { created, deleted, ok } from "../../common/http";
import { toMeta } from "../../common/pagination";
import { parse, reorderBody } from "../../common/validate";
import type { ExperiencesService } from "./experiences.service";
import { adminExperiencesQuery, experienceBody, idParams, publicExperiencesQuery } from "./experiences.schema";

export class ExperiencesController {
  constructor(private readonly service: ExperiencesService) {}

  listPublic = async (req: Request, res: Response) => {
    const q = parse(publicExperiencesQuery, req.query);
    const { items, total } = await this.service.listPublic(q.page, q.limit);
    ok(res, items, { meta: toMeta(q.page, q.limit, total) });
  };

  listAdmin = async (req: Request, res: Response) => {
    const q = parse(adminExperiencesQuery, req.query);
    const { items, total } = await this.service.listAdmin(q);
    ok(res, items, { meta: toMeta(q.page, q.limit, total) });
  };

  get = async (req: Request, res: Response) => {
    ok(res, await this.service.get(parse(idParams, req.params).id));
  };

  create = async (req: Request, res: Response) => {
    created(res, await this.service.create(parse(experienceBody, req.body)), "Experience created.");
  };

  update = async (req: Request, res: Response) => {
    const { id } = parse(idParams, req.params);
    ok(res, await this.service.update(id, parse(experienceBody, req.body)), { message: "Experience updated." });
  };

  remove = async (req: Request, res: Response) => {
    await this.service.remove(parse(idParams, req.params).id);
    deleted(res, "Experience deleted.");
  };

  reorder = async (req: Request, res: Response) => {
    const items = parse(reorderBody, req.body).items.map((i) => ({ id: parse(idParams, { id: i.id }).id, sortOrder: i.sortOrder }));
    await this.service.reorder(items);
    ok(res, null, { message: "Order saved." });
  };
}
