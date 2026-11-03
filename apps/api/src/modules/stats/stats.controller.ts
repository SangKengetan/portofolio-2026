import type { Request, Response } from "express";
import { ok } from "../../common/http";
import type { StatsService } from "./stats.service";

export class StatsController {
  constructor(private readonly service: StatsService) {}
  get = async (_req: Request, res: Response) => ok(res, await this.service.get());
}
