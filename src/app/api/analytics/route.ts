import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api-session";
import { recordAnalyticsEvent } from "@/lib/analytics";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getRequestSession(request);
  const body = (await request.json().catch(() => null)) as {
    eventName?: unknown;
    movieId?: unknown;
    mediaType?: unknown;
    metadata?: unknown;
  } | null;

  const recorded = recordAnalyticsEvent({
    request,
    userId: session?.user.id,
    eventName: body?.eventName,
    movieId: body?.movieId,
    mediaType: body?.mediaType,
    metadata: body?.metadata,
  });

  if (!recorded) {
    return NextResponse.json({ error: "Invalid analytics event" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
