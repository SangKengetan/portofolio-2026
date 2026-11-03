import type { Request, Response } from "express";
import { ok } from "../../common/http";
import { parse } from "../../common/validate";
import type { ProfileService } from "./profile.service";
import { profileBody } from "./profile.schema";

export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  getPublic = async (_req: Request, res: Response) => ok(res, await this.service.getPublic());

  getAdmin = async (_req: Request, res: Response) => ok(res, await this.service.getAdmin());

  update = async (req: Request, res: Response) => {
    ok(res, await this.service.update(parse(profileBody, req.body)), { message: "Profile saved." });
  };
}
