import { notFound } from "../../common/errors";
import type { KyselyContactRepository, MessageFilters, MessageRow } from "../contact/contact.repository";

const toDto = (m: MessageRow) => ({
  id: m.id,
  name: m.name,
  email: m.email,
  subject: m.subject,
  message: m.message,
  isRead: m.isRead,
  createdAt: m.createdAt.toISOString(),
});

export class MessagesService {
  constructor(private readonly repo: KyselyContactRepository) {}

  async list(f: MessageFilters) {
    const { rows, total, unread } = await this.repo.list(f);
    return { items: rows.map(toDto), total, unread };
  }

  async get(id: string) {
    const row = await this.repo.findById(id);
    if (!row) throw notFound("Message");
    return toDto(row);
  }

  async setRead(id: string, isRead: boolean) {
    const row = await this.repo.setRead(id, isRead);
    if (!row) throw notFound("Message");
    return toDto(row);
  }

  async remove(id: string) {
    if (!(await this.repo.delete(id))) throw notFound("Message");
  }
}
