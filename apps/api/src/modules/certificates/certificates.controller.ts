import type { Request, Response } from "express";
import { created, deleted, ok } from "../../common/http";
import { toMeta } from "../../common/pagination";
import { parse, reorderBody } from "../../common/validate";
import type { CertificatesService } from "./certificates.service";
import { adminCertificatesQuery, certificateBody, idParams, publicCertificatesQuery } from "./certificates.schema";

export class CertificatesController {
  constructor(private readonly service: CertificatesService) {}

  listPublic = async (req: Request, res: Response) => {
    const q = parse(publicCertificatesQuery, req.query);
    const { items, total } = await this.service.listPublic(q);
    ok(res, items, { meta: toMeta(q.page, q.limit, total) });
  };

  listAdmin = async (req: Request, res: Response) => {
    const q = parse(adminCertificatesQuery, req.query);
    const { items, total } = await this.service.listAdmin(q);
    ok(res, items, { meta: toMeta(q.page, q.limit, total) });
  };

  get = async (req: Request, res: Response) => {
    ok(res, await this.service.get(parse(idParams, req.params).id));
  };

  create = async (req: Request, res: Response) => {
    created(res, await this.service.create(parse(certificateBody, req.body)), "Certificate created.");
  };

  update = async (req: Request, res: Response) => {
    const { id } = parse(idParams, req.params);
    ok(res, await this.service.update(id, parse(certificateBody, req.body)), { message: "Certificate updated." });
  };

  remove = async (req: Request, res: Response) => {
    await this.service.remove(parse(idParams, req.params).id);
    deleted(res, "Certificate deleted.");
  };

  reorder = async (req: Request, res: Response) => {
    const items = parse(reorderBody, req.body).items.map((i) => ({ id: parse(idParams, { id: i.id }).id, sortOrder: i.sortOrder }));
    await this.service.reorder(items);
    ok(res, null, { message: "Order saved." });
  };
}
