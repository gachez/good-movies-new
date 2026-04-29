import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api-session";
import { addMovieToList, normalizeMoviePayload } from "@/lib/lists";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    listId: string;
  }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getRequestSession(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    movie?: unknown;
  } | null;
  const movie = normalizeMoviePayload(body?.movie);

  if (!movie) {
    return NextResponse.json({ error: "Invalid movie" }, { status: 400 });
  }

  const list = addMovieToList({
    userId: session.user.id,
    listId,
    movie,
  });

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  return NextResponse.json({ list });
}
