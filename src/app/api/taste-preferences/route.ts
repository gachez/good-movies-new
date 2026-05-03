import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api-session";
import {
  getUserAvoidPreferences,
  sanitizeAvoidPreferences,
  upsertUserAvoidPreferences,
} from "@/lib/taste-preferences";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getRequestSession(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    preferences: getUserAvoidPreferences(session.user.id),
  });
}

export async function POST(request: NextRequest) {
  const session = await getRequestSession(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const preferences = sanitizeAvoidPreferences(body);
  const saved = upsertUserAvoidPreferences(session.user.id, preferences);

  return NextResponse.json({ preferences: saved });
}
