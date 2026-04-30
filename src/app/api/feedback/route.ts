import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api-session";
import { recordFeedbackEvent } from "@/lib/analytics";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getRequestSession(request);
  const body = (await request.json().catch(() => null)) as {
    movieId?: unknown;
    mediaType?: unknown;
    feedback?: unknown;
    source?: unknown;
    note?: unknown;
    metadata?: unknown;
  } | null;

  const recorded = recordFeedbackEvent({
    request,
    userId: session?.user.id,
    movieId: body?.movieId,
    mediaType: body?.mediaType,
    feedback: body?.feedback,
    source: body?.source,
    note: body?.note,
    metadata: body?.metadata,
  });

  if (!recorded) {
    return NextResponse.json({ error: "Invalid feedback" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
