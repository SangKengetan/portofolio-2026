/**
 * Tiny in-process TTL cache for public read endpoints.
 *
 * Invalidation: every admin mutation calls `clear()` (through ContentPublisher), so readers never see
 * stale content for longer than the request that follows a save. The TTL is only a safety net.
 * This is single-instance by design; with several API containers, swap it for Redis.
 */
export class TtlCache {
  private store = new Map<string, { value: unknown; expires: number }>();

  constructor(
    private readonly ttlMs = 60_000,
    private readonly now: () => number = Date.now,
    private readonly maxEntries = 500,
  ) {}

  async wrap<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.store.get(key);
    if (hit && hit.expires > this.now()) return hit.value as T;
    const value = await load();
    if (this.store.size >= this.maxEntries) this.store.delete(this.store.keys().next().value as string);
    this.store.set(key, { value, expires: this.now() + this.ttlMs });
    return value;
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
