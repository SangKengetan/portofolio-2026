import pino from "pino";
import { describe, expect, it, vi } from "vitest";
import { InlineJobQueue } from "../../src/lib/jobs";
import type { MailMessage, Mailer } from "../../src/lib/mailer";
import type { ContactRepository, NewMessage } from "../../src/modules/contact/contact.repository";
import { ContactService } from "../../src/modules/contact/contact.service";
import { GithubService, toContributions } from "../../src/modules/github/github.service";

const silent = pino({ level: "silent" });

function setup(notifyTo: string | null = "owner@example.com") {
  const stored: NewMessage[] = [];
  const repo: ContactRepository = {
    insert: async (m) => {
      stored.push(m);
      return { id: "id", isRead: false, createdAt: new Date("2026-10-26T00:00:00Z"), ...m } as never;
    },
  };
  const sent: MailMessage[] = [];
  const mailer: Mailer = { send: async (m) => void sent.push(m) };
  const jobs = new InlineJobQueue();
  const service = new ContactService(repo, jobs, mailer, silent, { ipHashSecret: "secret-secret-1234", notifyTo: notifyTo ?? undefined });
  return { service, stored, sent, jobs };
}

const valid = { name: "Ada Lovelace", email: "ada@example.com", message: "Hello, I would like to talk about a project." };

describe("ContactService", () => {
  it("stores the message with a hashed IP and e-mails the owner", async () => {
    const { service, stored, sent, jobs } = setup();
    expect(await service.submit(valid, { ip: "203.0.113.9" })).toBe(true);
    await jobs.drain();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(stored[0])).not.toContain("203.0.113.9");
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: "owner@example.com", replyTo: { address: "ada@example.com" } });
  });

  it("silently drops honeypot submissions (nothing stored, nothing sent)", async () => {
    const { service, stored, sent, jobs } = setup();
    expect(await service.submit({ ...valid, website: "http://spam.example" })).toBe(false);
    await jobs.drain();
    expect(stored).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it("validates input with the shared schema", async () => {
    const { service } = setup();
    await expect(service.submit({ ...valid, email: "nope" })).rejects.toMatchObject({ status: 422, fields: { email: expect.any(String) } });
    await expect(service.submit({ ...valid, message: "short" })).rejects.toMatchObject({ status: 422 });
  });

  it("strips line breaks from header fields (header injection)", async () => {
    const { service, sent, jobs } = setup();
    await service.submit({ ...valid, name: "Eve\r\nBcc: victim@example.com", subject: "Hi\r\nBcc: x@y.z" });
    await jobs.drain();
    expect(sent[0]!.subject).not.toMatch(/[\r\n]/);
    expect(sent[0]!.replyTo!.name).not.toMatch(/[\r\n]/);
  });

  it("still stores the message when no notification address is configured", async () => {
    const { service, stored, sent, jobs } = setup(null);
    await service.submit(valid);
    await jobs.drain();
    expect(stored).toHaveLength(1);
    expect(sent).toHaveLength(0);
  });
});

describe("toContributions", () => {
  const day = (date: string, count: number, level: string) => ({ date, contributionCount: count, contributionLevel: level });
  const calendar = {
    totalContributions: 7,
    weeks: [
      { contributionDays: [day("2026-10-18", 0, "NONE"), day("2026-10-19", 2, "FIRST_QUARTILE"), day("2026-10-20", 3, "SECOND_QUARTILE")] },
      { contributionDays: [day("2026-10-25", 0, "NONE"), day("2026-10-26", 2, "FOURTH_QUARTILE")] },
    ],
  };

  it("maps levels and computes streak / active days", () => {
    const r = toContributions("octocat", calendar);
    expect(r).toMatchObject({ username: "octocat", profileUrl: "https://github.com/octocat", totalLastYear: 7, longestStreak: 2, activeDaysPercent: 60 });
    expect(r.weeks[0]!.map((d) => d.level)).toEqual([0, 1, 2]);
    expect(r.weeks[1]![1]).toEqual({ date: "2026-10-26", count: 2, level: 4 });
  });
});

describe("GithubService", () => {
  const body = {
    data: { user: { contributionsCollection: { contributionCalendar: { totalContributions: 1, weeks: [{ contributionDays: [{ date: "2026-10-26", contributionCount: 1, contributionLevel: "FIRST_QUARTILE" }] }] } } } },
  };
  const ok = () => new Response(JSON.stringify(body), { status: 200 });

  it("is unavailable (503) until a token and username are configured", async () => {
    const svc = new GithubService({}, silent, vi.fn());
    await expect(svc.getContributions()).rejects.toMatchObject({ status: 503, code: "GITHUB_NOT_CONFIGURED" });
  });

  it("caches for six hours and serves stale data when GitHub fails", async () => {
    let now = 0;
    const fetchFn = vi.fn<typeof fetch>().mockImplementationOnce(async () => ok());
    const svc = new GithubService({ token: "t", username: "octocat" }, silent, fetchFn, () => now);
    const first = await svc.getContributions();
    await svc.getContributions();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    now += 7 * 3600_000;
    fetchFn.mockImplementationOnce(async () => new Response("down", { status: 502 }));
    expect(await svc.getContributions()).toEqual(first);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("never sends the token anywhere except GitHub's GraphQL endpoint", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(async () => ok());
    await new GithubService({ token: "secret-token", username: "octocat" }, silent, fetchFn).getContributions();
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://api.github.com/graphql");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer secret-token");
  });

  it("reports an outage when there is nothing cached", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new Error("network"));
    const svc = new GithubService({ token: "t", username: "u" }, silent, fetchFn);
    await expect(svc.getContributions()).rejects.toMatchObject({ status: 503, code: "GITHUB_UNAVAILABLE" });
  });
});
