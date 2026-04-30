import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/api-session";
import { betaLimitHeaders, consumeBetaLimit } from "@/lib/beta-limits";
import {
  getStoredTasteProfile,
  isTasteProfileFresh,
  refreshTasteProfile,
} from "@/lib/taste-profile";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getRequestSession(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    force?: unknown;
  } | null;
  const force = body?.force === true;
  const existing = getStoredTasteProfile(session.user.id);

  if (!force && isTasteProfileFresh(existing)) {
    return NextResponse.json({
      profile: existing,
      refreshed: false,
    });
  }

  const betaLimit = consumeBetaLimit({
    request,
    userId: session.user.id,
    action: "ai_profile_refresh",
  });

  if (!betaLimit.allowed) {
    return NextResponse.json(
      {
        profile: existing,
        refreshed: false,
        error:
          "You have reached today's beta taste refresh limit. Your existing profile will keep working.",
      },
      {
        status: existing ? 200 : 429,
        headers: betaLimitHeaders(betaLimit),
      }
    );
  }

  try {
    const profile = await refreshTasteProfile(session.user.id);
    return NextResponse.json({
      profile,
      refreshed: !!profile,
    });
  } catch (error) {
    console.error("AI taste profile refresh failed:", error);
    return NextResponse.json(
      {
        profile: existing,
        refreshed: false,
        error: "Could not refresh taste profile",
      },
      { status: existing ? 200 : 500 }
    );
  }
}
