import type { Request, Response } from "express";
import { notFound } from "../../common/errors";
import { created, deleted, ok } from "../../common/http";
import { toMeta } from "../../common/pagination";
import { parse, reorderBody } from "../../common/validate";
import type { ProjectsService } from "./projects.service";
import {
  adminProjectsQuery,
  blocksBody,
  idParams,
  metricsBody,
  projectBody,
  publicProjectsQuery,
  slugParams,
  statusBody,
} from "./projects.schema";

export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  /* ---- public ---- */

  listPublic = async (req: Request, res: Response) => {
    const q = parse(publicProjectsQuery, req.query);
    const { items, total } = await this.service.listPublic(q);
    ok(res, items, { meta: toMeta(q.page, q.limit, total) });
  };

  getPublic = async (req: Request, res: Response) => {
    const { slug } = parse(slugParams, req.params);
    const project = await this.service.getPublicBySlug(slug);
    if (!project) throw notFound("Project");
    ok(res, project);
  };

  /* ---- admin ---- */

  listAdmin = async (req: Request, res: Response) => {
    const q = parse(adminProjectsQuery, req.query);
    const { items, total } = await this.service.listAdmin(q);
    ok(res, items, { meta: toMeta(q.page, q.limit, total) });
  };

  getAdmin = async (req: Request, res: Response) => {
    const { id } = parse(idParams, req.params);
    ok(res, await this.service.getAdmin(id));
  };

  create = async (req: Request, res: Response) => {
    created(res, await this.service.create(parse(projectBody, req.body)), "Project created.");
  };

  update = async (req: Request, res: Response) => {
    const { id } = parse(idParams, req.params);
    ok(res, await this.service.update(id, parse(projectBody, req.body)), { message: "Project updated." });
  };

  setStatus = async (req: Request, res: Response) => {
    const { id } = parse(idParams, req.params);
    const { status } = parse(statusBody, req.body);
    ok(res, await this.service.setStatus(id, status), { message: `Project is now ${status}.` });
  };

  remove = async (req: Request, res: Response) => {
    const { id } = parse(idParams, req.params);
    await this.service.remove(id);
    deleted(res, "Project deleted.");
  };

  putMetrics = async (req: Request, res: Response) => {
    const { id } = parse(idParams, req.params);
    const { items } = parse(metricsBody, req.body);
    ok(res, await this.service.replaceMetrics(id, items), { message: "Metrics saved." });
  };

  putBlocks = async (req: Request, res: Response) => {
    const { id } = parse(idParams, req.params);
    const { blocks } = parse(blocksBody, req.body);
    ok(res, await this.service.replaceBlocks(id, blocks), { message: "Case study saved." });
  };

  reorder = async (req: Request, res: Response) => {
    await this.service.reorder(parse(reorderBody, req.body).items.map((i) => ({ id: parse(idParams, { id: i.id }).id, sortOrder: i.sortOrder })));
    ok(res, null, { message: "Order saved." });
  };
}
