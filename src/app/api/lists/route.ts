import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api-session";
import {
  createMovieList,
  getUserLists,
  normalizeListDescription,
  normalizeListName,
} from "@/lib/lists";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getRequestSession(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ lists: getUserLists(session.user.id) });
}

export async function POST(request: NextRequest) {
  const session = await getRequestSession(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    description?: unknown;
  } | null;
  const name = normalizeListName(body?.name);
  const description = normalizeListDescription(body?.description);

  if (!name) {
    return NextResponse.json({ error: "List name is required" }, { status: 400 });
  }

  try {
    const list = createMovieList({
      userId: session.user.id,
      name,
      description,
    });

    return NextResponse.json({ list }, { status: 201 });
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
