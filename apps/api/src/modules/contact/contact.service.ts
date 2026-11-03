import { contactSchema } from "@portfolio/shared";
import { parse } from "../../common/validate";
import { hashIp } from "../../lib/crypto";
import type { JobQueue } from "../../lib/jobs";
import type { Logger } from "../../lib/logger";
import type { Mailer } from "../../lib/mailer";
import type { ContactRepository } from "./contact.repository";

export interface ContactContext {
  ip?: string;
}

/** Header values must not contain line breaks (header-injection). */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

export class ContactService {
  constructor(
    private readonly repo: ContactRepository,
    private readonly jobs: JobQueue,
    private readonly mailer: Mailer,
    private readonly log: Logger,
    private readonly settings: { ipHashSecret: string; notifyTo?: string },
  ) {}

  /**
   * Handles POST /contact. Returns `true` when a message was stored.
   *
   * The hidden "website" field is a honeypot: humans leave it empty, bots fill it. A filled honeypot is
   * answered exactly like a success (so the bot learns nothing) but nothing is stored or e-mailed.
   */
  async submit(raw: unknown, ctx: ContactContext = {}): Promise<boolean> {
    const website = (raw as { website?: unknown } | null)?.website;
    if (typeof website === "string" && website.trim() !== "") {
      this.log.warn("contact form honeypot triggered");
      return false;
    }

    const input = parse(contactSchema, raw);
    const stored = await this.repo.insert({
      name: input.name,
      email: input.email,
      subject: input.subject ? input.subject : null,
      message: input.message,
      ipHash: hashIp(ctx.ip, this.settings.ipHashSecret),
    });

    const to = this.settings.notifyTo;
    if (to) {
      // Sent in the background: a slow or broken SMTP server must never fail the visitor's request.
      this.jobs.enqueue(
        "contact-notification",
        () =>
          this.mailer.send({
            to,
            subject: `[Portfolio] ${oneLine(input.subject || `New message from ${input.name}`)}`.slice(0, 200),
            text: `From: ${oneLine(input.name)} <${input.email}>\nReceived: ${stored.createdAt.toISOString()}\n\n${input.message}\n`,
            replyTo: { name: oneLine(input.name), address: input.email },
          }),
        { attempts: 3 },
      );
    }
    return true;
  }
}
