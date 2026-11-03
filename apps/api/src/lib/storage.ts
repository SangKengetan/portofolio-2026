import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/** Where uploaded bytes live. Local disk now; an S3 implementation can replace it without touching callers. */
export interface Storage {
  save(relativePath: string, data: Buffer): Promise<void>;
  remove(relativePath: string): Promise<void>;
}

export class LocalStorage implements Storage {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  /** Resolves a relative path and refuses anything that escapes the upload root. */
  private resolve(relativePath: string): string {
    const full = path.resolve(this.root, relativePath.replace(/^\/+/, ""));
    if (full !== this.root && !full.startsWith(this.root + path.sep)) {
      throw new Error("Path escapes the upload directory");
    }
    return full;
  }

  async save(relativePath: string, data: Buffer): Promise<void> {
    const target = this.resolve(relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data, { flag: "wx" });
  }

  async remove(relativePath: string): Promise<void> {
    await rm(this.resolve(relativePath), { force: true });
  }
}
