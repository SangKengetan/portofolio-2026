import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Called by the API after every content change (section 7, step 3):
 * POST /api/revalidate  — header x-revalidate-secret
 * body { "paths": ["/", "/projects", "/projects/slug-x"], "tags": ["projects"] }
 */
const bodySchema = z.object({
  paths: z.array(z.string().startsWith("/")).max(50).default([]),
  tags: z.array(z.string().min(1)).max(50).default([]),
});

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || request.headers.get("x-revalidate-secret") !== secret) {
    // Visible in the Next.js terminal: content saved in /admin will NOT appear until the cache expires.
    console.warn(
      secret
        ? "[revalidate] Rejected: x-revalidate-secret does not match REVALIDATE_SECRET. It must be identical in apps/api/.env and apps/web/.env.local."
        : "[revalidate] Rejected: REVALIDATE_SECRET is not set in apps/web/.env.local.",
    );
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Invalid secret" } }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid body" } }, { status: 400 });
  }
  for (const tag of parsed.data.tags) revalidateTag(tag);
  for (const path of parsed.data.paths) revalidatePath(path);
  return NextResponse.json({ data: { revalidated: true, ...parsed.data, at: new Date().toISOString() } });
}
