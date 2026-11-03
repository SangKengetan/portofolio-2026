import { NextResponse } from "next/server";
import { getProfile } from "@/lib/api";

/** /cv → redirects to the latest CV file (section 4). */
export async function GET(request: Request) {
  const profile = await getProfile();
  if (!profile.cvUrl) return new NextResponse("CV not available yet.", { status: 404 });
  return NextResponse.redirect(new URL(profile.cvUrl, request.url), 307);
}
