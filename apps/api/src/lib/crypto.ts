import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");

/** Opaque random token for refresh cookies (384 bits). */
export const randomToken = () => randomBytes(48).toString("base64url");

/** HMAC of the client IP: lets us rate-limit/analyse spam without storing the address itself. */
export const hashIp = (ip: string | undefined, secret: string) =>
  ip ? createHmac("sha256", secret).update(ip).digest("hex") : null;

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
