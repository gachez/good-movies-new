import { NextRequest, NextResponse } from "next/server";
import {
  getPopularMovies,
  getPopularTV,
  getTrendingMovies,
  getTrendingTV,
  TMDBMovie,
} from "@/lib/tmdb";

export const runtime = "nodejs";

function dedupeMovies(movies: TMDBMovie[]) {
  const seen = new Set<string>();
  return movies.filter((movie) => {
    const key = `${movie.mediaType || "movie"}:${movie.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function decorateMovie(movie: TMDBMovie, index: number) {
  return {
    ...movie,
    relevanceScore: Math.max(96 - index, 60),
    reviews: [],
    feedReason:
      movie.mediaType === "tv"
        ? "A strong series signal for your first taste profile."
        : "A strong movie signal for your first taste profile.",
  };
}

function getPage(request: NextRequest) {
  const page = Number(new URL(request.url).searchParams.get("page") || 1);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(Math.floor(page), 50);
}

export async function GET(request: NextRequest) {
  const page = getPage(request);
  const [trendingMovies, trendingTV, popularMovies, popularTV] =
    await Promise.all([
      getTrendingMovies(page),
      getTrendingTV(page),
      getPopularMovies(page),
      getPopularTV(page),
    ]);

  const results = dedupeMovies([
    ...trendingMovies,
    ...trendingTV,
    ...popularMovies,
    ...popularTV,
  ])
    .filter((movie) => movie.poster_path && !movie.adult)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 32)
    .map(decorateMovie);

  return NextResponse.json({ results, nextPage: page + 1 });
}
