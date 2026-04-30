import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api-session";
import { enableListSharing } from "@/lib/lists";

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
  const list = enableListSharing(session.user.id, listId);

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  return NextResponse.json({ list });
}
