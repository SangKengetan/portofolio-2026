import type { Request, Response } from "express";
import { created } from "../../common/http";
import type { ContactService } from "./contact.service";

export class ContactController {
  constructor(private readonly service: ContactService) {}

  submit = async (req: Request, res: Response) => {
    await this.service.submit(req.body, { ip: req.ip });
    // Same answer whether the message was stored or dropped as spam.
    created(res, { received: true }, "Message sent.");
  };
}
