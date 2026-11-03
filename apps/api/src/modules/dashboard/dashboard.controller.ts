import type { Request, Response } from "express";
import { ok } from "../../common/http";
import type { DashboardService } from "./dashboard.service";

export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  summary = async (_req: Request, res: Response) => ok(res, await this.service.summary());
}
