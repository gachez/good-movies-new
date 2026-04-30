import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api-session";
import { removeMovieFromList } from "@/lib/lists";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    listId: string;
    itemId: string;
  }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await getRequestSession(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId, itemId } = await context.params;
  const list = removeMovieFromList({
    userId: session.user.id,
    listId,
    itemId,
  });

  if (!list) {
    return NextResponse.json({ error: "List item not found" }, { status: 404 });
  }

  return NextResponse.json({ list });
}
