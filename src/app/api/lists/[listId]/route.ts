import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api-session";
import {
  deleteMovieList,
  getUserListById,
  normalizeListDescription,
  normalizeListName,
  reorderListItems,
  updateMovieList,
} from "@/lib/lists";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    listId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getRequestSession(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId } = await context.params;
  const list = getUserListById(session.user.id, listId);

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  return NextResponse.json({ list });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getRequestSession(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    description?: unknown;
    itemIds?: unknown;
  } | null;

  if (Array.isArray(body?.itemIds)) {
    const itemIds = body.itemIds.filter(
      (itemId): itemId is string => typeof itemId === "string"
    );
    const list = reorderListItems({
      userId: session.user.id,
      listId,
      itemIds,
    });

    if (!list) {
      return NextResponse.json({ error: "Invalid reorder request" }, { status: 400 });
    }

    return NextResponse.json({ list });
  }

  const name = normalizeListName(body?.name);
  const description = normalizeListDescription(body?.description);

  if (!name) {
    return NextResponse.json({ error: "List name is required" }, { status: 400 });
  }

  try {
    const list = updateMovieList({
      userId: session.user.id,
      listId,
      name,
      description,
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    return NextResponse.json({ list });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      return NextResponse.json(
        { error: "You already have a list with that name" },
        { status: 409 }
      );
    }

    throw error;
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await getRequestSession(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId } = await context.params;
  const deleted = deleteMovieList(session.user.id, listId);

  if (!deleted) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
