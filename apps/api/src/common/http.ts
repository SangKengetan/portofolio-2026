import type { Response } from "express";
import type { PageMeta } from "./pagination";

/**
 * Every successful response uses the same envelope:
 *   { "success": true, "message": "...", "data": ..., "meta": { ... } }
 * (`data` is what the Next.js frontend reads, see apps/web/lib/api.ts)
 */
export interface SuccessBody<T> {
  success: true;
  message: string;
  data: T;
  meta?: PageMeta;
}

export function ok<T>(res: Response, data: T, options: { message?: string; meta?: PageMeta; status?: number } = {}) {
  const body: SuccessBody<T> = {
    success: true,
    message: options.message ?? "OK",
    data,
    ...(options.meta ? { meta: options.meta } : {}),
  };
  return res.status(options.status ?? 200).json(body);
}

export const created = <T>(res: Response, data: T, message = "Created") => ok(res, data, { message, status: 201 });

/** 204 would hide the envelope from fetch().json(), so deletes answer 200 with `data: null`. */
export const deleted = (res: Response, message = "Deleted") => ok(res, null, { message });
