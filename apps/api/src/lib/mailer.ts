import nodemailer, { type Transporter } from "nodemailer";
import type { AppConfig } from "../config/env";
import type { Logger } from "./logger";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  replyTo?: { name: string; address: string };
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export class SmtpMailer implements Mailer {
  private transporter: Transporter;

  constructor(private readonly config: AppConfig["mail"]) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.config.from, ...message });
  }
}

/** Used when SMTP is not configured: messages are still stored, only the notification is skipped. */
export class NoopMailer implements Mailer {
  constructor(private readonly log: Logger) {}
  async send(message: MailMessage): Promise<void> {
    this.log.info({ subject: message.subject }, "SMTP not configured — notification e-mail skipped");
  }
}

export function createMailer(config: AppConfig["mail"], log: Logger): Mailer {
  return config.host ? new SmtpMailer(config) : new NoopMailer(log);
}
