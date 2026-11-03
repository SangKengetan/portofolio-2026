import type { Request, Response } from "express";
import { created, deleted, ok } from "../../common/http";
import { toMeta } from "../../common/pagination";
import { parse, reorderBody } from "../../common/validate";
import type { TechnologiesService } from "./technologies.service";
import {
  adminTechnologiesQuery,
  publicTechnologiesQuery,
  technologyBody,
  technologyIdParams,
} from "./technologies.schema";

export class TechnologiesController {
  constructor(private readonly service: TechnologiesService) {}

  listPublic = async (req: Request, res: Response) => {
    const q = parse(publicTechnologiesQuery, req.query);
    const { items, total } = await this.service.listPublic(q);
    ok(res, items, { meta: toMeta(q.page, q.limit, total) });
  };

  listAdmin = async (req: Request, res: Response) => {
    const q = parse(adminTechnologiesQuery, req.query);
    const { items, total } = await this.service.listAdmin(q);
    ok(res, items, { meta: toMeta(q.page, q.limit, total) });
  };

  get = async (req: Request, res: Response) => {
    const { id } = parse(technologyIdParams, req.params);
    ok(res, await this.service.get(id));
  };

  create = async (req: Request, res: Response) => {
    created(res, await this.service.create(parse(technologyBody, req.body)), "Technology created.");
  };

  update = async (req: Request, res: Response) => {
    const { id } = parse(technologyIdParams, req.params);
    ok(res, await this.service.update(id, parse(technologyBody, req.body)), { message: "Technology updated." });
  };

  remove = async (req: Request, res: Response) => {
    const { id } = parse(technologyIdParams, req.params);
    await this.service.remove(id);
    deleted(res, "Technology deleted.");
  };

  reorder = async (req: Request, res: Response) => {
    await this.service.reorder(parse(reorderBody, req.body).items);
    ok(res, null, { message: "Order saved." });
  };
}
