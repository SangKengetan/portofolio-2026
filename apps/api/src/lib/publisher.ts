import type { TtlCache } from "./cache";
import type { JobQueue } from "./jobs";
import type { Logger } from "./logger";

/**
 * "Something changed" hub. Every admin mutation calls `changed(scope)`; this
 *   1. clears the public read cache (so the next API read is fresh), and
 *   2. asks Next.js to revalidate the affected tags/paths (rancangan §7 step 3, §10.2) in the background.
 *
 * Tags match the ones used by apps/web/lib/api.ts.
 */
export type ContentScope =
  | "profile"
  | "projects"
  | "experiences"
  | "technologies"
  | "certificates"
  | "achievements"
  | "media";

export interface RevalidatePayload {
  paths: string[];
  tags: string[];
}

export function revalidationFor(scope: ContentScope, slugs: string[] = []): RevalidatePayload {
  switch (scope) {
    case "profile":
      return { tags: ["profile"], paths: ["/"] };
    case "projects":
      return {
        tags: ["projects", "stats", ...slugs.map((s) => `project:${s}`)],
        paths: ["/", "/projects", ...slugs.map((s) => `/projects/${s}`)],
      };
    case "experiences":
      return { tags: ["experiences", "stats"], paths: ["/"] };
    case "technologies":
      return { tags: ["technologies", "projects", "experiences"], paths: ["/", "/projects"] };
    case "certificates":
    case "achievements":
      return { tags: [scope, "stats"], paths: ["/", "/certificates"] };
    case "media":
      // A media change (alt text, delete) can touch any page that renders images.
      return {
        tags: ["profile", "projects", "experiences", "certificates"],
        paths: ["/", "/projects", "/certificates"],
      };
  }
}

export interface RevalidateConfig {
  url?: string;
  secret?: string;
}

export class ContentPublisher {
  constructor(
    private readonly deps: {
      cache: TtlCache;
      jobs: JobQueue;
      config: RevalidateConfig;
      log: Logger;
      fetchFn?: typeof fetch;
    },
  ) {}

  changed(scope: ContentScope, options: { slugs?: string[] } = {}): void {
    this.deps.cache.clear();
    const { url, secret } = this.deps.config;
    if (!url) return;
    const payload = revalidationFor(scope, options.slugs ?? []);
    const doFetch = this.deps.fetchFn ?? fetch;
    this.deps.jobs.enqueue(`revalidate:${scope}`, async () => {
      const res = await doFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-revalidate-secret": secret ?? "" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`Revalidate responded ${res.status}`);
    });
  }
}
