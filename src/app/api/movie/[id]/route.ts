import { NextRequest, NextResponse } from "next/server";
import { enrichMovieForFeed, getMovieDetails, getTVDetails } from "@/lib/tmdb";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { searchParams } = new URL(_request.url);
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";
  const params = await context.params;
  const movieId = Number(params.id);

  if (!Number.isFinite(movieId)) {
    return NextResponse.json({ error: "Invalid movie id" }, { status: 400 });
  }

  const movie =
    type === "tv" ? await getTVDetails(movieId) : await getMovieDetails(movieId);

  if (!movie) {
    return NextResponse.json({ error: "Movie not found" }, { status: 404 });
  }

  const result = await enrichMovieForFeed(
    movie,
    90,
    "Shared from FlickBuddy."
  );

  return NextResponse.json({ result });
}
