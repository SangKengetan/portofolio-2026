import type { Request, Response } from "express";
import { ok } from "../../common/http";
import type { GithubService } from "./github.service";

export class GithubController {
  constructor(private readonly service: GithubService) {}
  contributions = async (_req: Request, res: Response) => ok(res, await this.service.getContributions());
}
