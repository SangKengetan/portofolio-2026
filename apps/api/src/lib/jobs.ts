import type { Logger } from "./logger";

/**
 * Minimal in-process background queue for work that must not block a request
 * (contact e-mails, Next.js revalidation). Jobs retry with exponential back-off.
 *
 * Trade-off: jobs live in memory, so they are lost if the process is killed mid-retry. For this
 * portfolio that is acceptable (messages are already saved in the database before the e-mail job runs).
 * If volume grows, replace this class with BullMQ/Redis — the `enqueue` signature can stay the same.
 */
export interface JobQueue {
  enqueue(name: string, run: () => Promise<void>, options?: { attempts?: number }): void;
  drain(timeoutMs?: number): Promise<void>;
}

export class InMemoryJobQueue implements JobQueue {
  private pending = new Set<Promise<void>>();

  constructor(
    private readonly log: Logger,
    private readonly baseDelayMs = 1000,
  ) {}

  enqueue(name: string, run: () => Promise<void>, options: { attempts?: number } = {}): void {
    const attempts = options.attempts ?? 3;
    const task = this.runWithRetry(name, run, attempts).finally(() => this.pending.delete(task));
    this.pending.add(task);
  }

  private async runWithRetry(name: string, run: () => Promise<void>, attempts: number): Promise<void> {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        await run();
        return;
      } catch (err) {
        const last = attempt === attempts;
        this.log[last ? "error" : "warn"]({ err, job: name, attempt, attempts }, last ? "job failed" : "job failed, retrying");
        if (!last) await new Promise((r) => setTimeout(r, this.baseDelayMs * 2 ** (attempt - 1)));
      }
    }
  }

  /** Waits for running jobs (graceful shutdown). */
  async drain(timeoutMs = 5000): Promise<void> {
    if (this.pending.size === 0) return;
    await Promise.race([Promise.allSettled([...this.pending]), new Promise((r) => setTimeout(r, timeoutMs))]);
  }
}

/** Test helper: runs jobs immediately and lets the test await them. */
export class InlineJobQueue implements JobQueue {
  private pending: Promise<void>[] = [];
  readonly failures: unknown[] = [];

  enqueue(_name: string, run: () => Promise<void>): void {
    this.pending.push(run().catch((err) => void this.failures.push(err)));
  }

  async drain(): Promise<void> {
    await Promise.all(this.pending);
    this.pending = [];
  }
}
