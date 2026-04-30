import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureBackendReady } from "@/lib/auth-migrations";
import {
  getUserMoviesByAction,
  MovieInteractionAction,
  upsertMovieInteraction,
} from "@/lib/user-movies";
import { getPostHogClient } from "@/lib/posthog-server";
import { Movie } from "@/types/movie";

export const runtime = "nodejs";

const allowedActions = new Set<MovieInteractionAction>([
  "like",
  "dislike",
  "save",
  "watch",
  "rate",
  "share",
]);

async function getSession(request: NextRequest) {
  await ensureBackendReady();
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function GET(request: NextRequest) {
  const session = await getSession(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    liked: getUserMoviesByAction(session.user.id, "like"),
    saved: getUserMoviesByAction(session.user.id, "save"),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    action?: MovieInteractionAction;
    value?: number | null;
    movie?: Movie;
  };

  if (!body.movie?.id || !body.action || !allowedActions.has(body.action)) {
    return NextResponse.json({ error: "Invalid interaction" }, { status: 400 });
  }

  upsertMovieInteraction({
    userId: session.user.id,
    movie: body.movie,
    action: body.action,
    value: body.value ?? null,
  });

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: session.user.id,
    event: "movie_interaction_recorded",
    properties: {
      action: body.action,
      movie_id: body.movie.id,
      media_type: body.movie.mediaType === "tv" ? "tv" : "movie",
      title: body.movie.title,
      value: body.value ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
