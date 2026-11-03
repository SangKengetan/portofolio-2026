import { describe, expect, it, vi } from "vitest";
import { loadConfig } from "../../src/config/env";
import { slugify, uniqueSlug } from "../../src/common/slug";
import { likePattern, toMeta, toOffset } from "../../src/common/pagination";
import { isoDate, optText, optUrl, parse } from "../../src/common/validate";
import { AppError } from "../../src/common/errors";
import { TtlCache } from "../../src/lib/cache";
import { InMemoryJobQueue } from "../../src/lib/jobs";
import { sanitizeRichText } from "../../src/lib/sanitize";
import { createMediaUrlBuilder } from "../../src/lib/media-url";
import { LocalStorage } from "../../src/lib/storage";
import { revalidationFor } from "../../src/lib/publisher";
import { yearsOfExperience } from "../../src/modules/stats/stats.service";
import { z } from "zod";
import pino from "pino";

const silent = pino({ level: "silent" });

describe("config", () => {
  const base = {
    DATABASE_URL: "postgresql://u:p@localhost:5432/db",
    JWT_ACCESS_SECRET: "a".repeat(40),
    IP_HASH_SECRET: "b".repeat(20),
  };

  it("applies defaults and treats empty values as unset", () => {
    const cfg = loadConfig({ ...base, PORT: "", WEB_ORIGIN: "http://localhost:3000/, https://a.test" });
    expect(cfg.port).toBe(4000);
    expect(cfg.webOrigins).toEqual(["http://localhost:3000", "https://a.test"]);
    expect(cfg.serveUploads).toBe(true);
    expect(cfg.auth.cookieSecure).toBe(false);
  });

  it("lists every problem when required values are missing", () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
    expect(() => loadConfig({ ...base, JWT_ACCESS_SECRET: "short" })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("is strict in production", () => {
    const prod = { ...base, NODE_ENV: "production", WEB_ORIGIN: "https://example.com" };
    expect(loadConfig(prod).auth.cookieSecure).toBe(true);
    expect(loadConfig(prod).serveUploads).toBe(false);
    expect(loadConfig(prod).docsEnabled).toBe(false);
    expect(() => loadConfig({ ...prod, JWT_ACCESS_SECRET: "change-me".padEnd(40, "x") })).toThrow(/placeholder/);
    expect(() => loadConfig({ ...prod, WEB_ORIGIN: "http://example.com" })).toThrow(/https/);
    expect(() => loadConfig({ ...prod, COOKIE_SECURE: "false" })).toThrow(/COOKIE_SECURE/);
    expect(() => loadConfig({ ...prod, REVALIDATE_URL: "https://example.com/api/revalidate" })).toThrow(/REVALIDATE_SECRET/);
  });

  it("accepts the API's own origin for CSRF only while Swagger UI is enabled", () => {
    const prod = { ...base, NODE_ENV: "production", WEB_ORIGIN: "https://example.com", MEDIA_PUBLIC_URL: "https://api.example.com/", PORT: "4000" };
    expect(loadConfig(prod).csrfOrigins).toEqual(["https://example.com"]);
    expect(loadConfig({ ...prod, DOCS_ENABLED: "true" }).csrfOrigins).toEqual([
      "https://example.com",
      "https://api.example.com",
      "http://localhost:4000",
      "http://127.0.0.1:4000",
    ]);
  });
});

describe("slug", () => {
  it("slugifies", () => {
    expect(slugify("Clinic Queue System!")).toBe("clinic-queue-system");
    expect(slugify("  Café & Données  ")).toBe("cafe-donnees");
    expect(slugify("!!!")).toBe("item");
  });

  it("adds a numeric suffix until the slug is free", async () => {
    const taken = new Set(["demo", "demo-2"]);
    expect(await uniqueSlug("demo", async (s) => taken.has(s))).toBe("demo-3");
    expect(await uniqueSlug("fresh", async (s) => taken.has(s))).toBe("fresh");
  });
});

describe("pagination helpers", () => {
  it("computes meta and offset", () => {
    expect(toMeta(2, 10, 25)).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
    expect(toMeta(1, 10, 0).totalPages).toBe(1);
    expect(toOffset(3, 20)).toBe(40);
  });

  it("escapes LIKE wildcards", () => {
    expect(likePattern("50%_off\\")).toBe("%50\\%\\_off\\\\%");
  });
});

describe("validation helpers", () => {
  it("returns the first message per field with dotted paths", () => {
    const schema = z.object({ a: z.string().min(3, "too short"), list: z.array(z.object({ n: z.number() })) });
    try {
      parse(schema, { a: "x", list: [{ n: "no" }] });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const e = err as AppError;
      expect(e.status).toBe(422);
      expect(e.code).toBe("VALIDATION_ERROR");
      expect(e.fields).toMatchObject({ a: "too short" });
      expect(Object.keys(e.fields!)).toContain("list.0.n");
    }
  });

  it("uses the field message as the top-level message when only one field fails", () => {
    expect(() => parse(z.object({ a: z.string().min(3, "too short") }), { a: "x" })).toThrow("too short");
  });

  it("normalises optional text and urls", () => {
    expect(parse(optText(5), "  ")).toBeNull();
    expect(parse(optText(5), undefined)).toBeNull();
    expect(parse(optText(5), " hi ")).toBe("hi");
    expect(() => parse(optText(3), "toolong")).toThrow();
    expect(parse(optUrl, "")).toBeNull();
    expect(parse(optUrl, "https://example.com/x")).toBe("https://example.com/x");
    expect(() => parse(optUrl, "javascript:alert(1)")).toThrow();
    expect(() => parse(optUrl, "not a url")).toThrow();
  });

  it("validates calendar dates", () => {
    expect(parse(isoDate, "2024-02-29")).toBe("2024-02-29");
    expect(() => parse(isoDate, "2023-02-29")).toThrow();
    expect(() => parse(isoDate, "29-02-2024")).toThrow();
  });
});

describe("TtlCache", () => {
  it("serves cached values until they expire or are cleared", async () => {
    let now = 1000;
    const cache = new TtlCache(100, () => now);
    const load = vi.fn(async () => Math.random());
    const a = await cache.wrap("k", load);
    expect(await cache.wrap("k", load)).toBe(a);
    expect(load).toHaveBeenCalledTimes(1);
    now += 101;
    await cache.wrap("k", load);
    expect(load).toHaveBeenCalledTimes(2);
    cache.clear();
    await cache.wrap("k", load);
    expect(load).toHaveBeenCalledTimes(3);
  });
});

describe("InMemoryJobQueue", () => {
  it("retries failing jobs with back-off and then succeeds", async () => {
    const queue = new InMemoryJobQueue(silent, 1);
    let calls = 0;
    queue.enqueue("flaky", async () => {
      if (++calls < 3) throw new Error("boom");
    });
    await queue.drain(1000);
    expect(calls).toBe(3);
  });

  it("gives up after the configured attempts without throwing", async () => {
    const queue = new InMemoryJobQueue(silent, 1);
    let calls = 0;
    queue.enqueue("always", async () => {
      calls++;
      throw new Error("nope");
    }, { attempts: 2 });
    await queue.drain(1000);
    expect(calls).toBe(2);
  });
});

describe("sanitizeRichText", () => {
  it("keeps formatting and removes scripts, handlers and javascript: links", () => {
    const dirty =
      '<p onclick="x()">Hi <strong>there</strong><script>alert(1)</script> <a href="javascript:alert(1)">bad</a> <a href="https://ok.test" target="_blank">ok</a><img src=x onerror=alert(1)></p>';
    const clean = sanitizeRichText(dirty);
    expect(clean).toContain("<strong>there</strong>");
    expect(clean).not.toMatch(/script|onclick|onerror|javascript:|<img/i);
    expect(clean).toContain('href="https://ok.test"');
    expect(clean).toContain('rel="noopener noreferrer"');
  });
});

describe("media url builder", () => {
  const url = createMediaUrlBuilder("https://cdn.example.com/");
  it("makes upload paths absolute and leaves other paths alone", () => {
    expect(url("/uploads/2026/10/a.webp")).toBe("https://cdn.example.com/uploads/2026/10/a.webp");
    expect(url("/placeholders/x.svg")).toBe("/placeholders/x.svg");
  });
});

describe("LocalStorage", () => {
  it("refuses paths that escape the upload root", async () => {
    const storage = new LocalStorage("/tmp/some-root");
    await expect(storage.save("../evil.txt", Buffer.from("x"))).rejects.toThrow(/escapes/);
    await expect(storage.remove("../../etc/passwd")).rejects.toThrow(/escapes/);
  });
});

describe("revalidationFor", () => {
  it("maps content scopes to the tags/paths the website uses", () => {
    expect(revalidationFor("projects", ["a"])).toEqual({
      tags: ["projects", "stats", "project:a"],
      paths: ["/", "/projects", "/projects/a"],
    });
    expect(revalidationFor("profile")).toEqual({ tags: ["profile"], paths: ["/"] });
    expect(revalidationFor("certificates").paths).toContain("/certificates");
  });
});

describe("yearsOfExperience", () => {
  const now = new Date("2026-10-26T00:00:00Z");
  it("rounds to the nearest year and never goes negative", () => {
    expect(yearsOfExperience(null, now)).toBe(0);
    expect(yearsOfExperience("2025-02-01", now)).toBe(2);
    expect(yearsOfExperience("2026-06-01", now)).toBe(0);
    expect(yearsOfExperience("2023-10-01", now)).toBe(3);
    expect(yearsOfExperience("2030-01-01", now)).toBe(0);
  });
});
