import { NextRequest, NextResponse } from "next/server";
import {
  discoverMoviesByGenres,
  discoverTVByGenres,
  getGenreIdsByNames,
  getTrendingMovies,
  getTrendingTV,
  searchMulti,
  TMDBMovie,
} from "@/lib/tmdb";

type ManualSearchType = "all" | "movie" | "tv";

const VALID_TYPES = new Set(["all", "movie", "tv"]);

function getType(value: string | null): ManualSearchType {
  return VALID_TYPES.has(value || "") ? (value as ManualSearchType) : "all";
}

function decorateMovie(movie: TMDBMovie, index: number, feedReason: string) {
  return {
    ...movie,
    relevanceScore: Math.max(96 - index * 2, 45),
    feedReason,
    reviews: [],
  };
}

function dedupeMovies(movies: TMDBMovie[]) {
  const seen = new Set<string>();
  return movies.filter((movie) => {
    const key = `${movie.mediaType || "movie"}:${movie.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function filterByType(movies: TMDBMovie[], type: ManualSearchType) {
  if (type === "all") return movies;
  return movies.filter((movie) => (movie.mediaType || "movie") === type);
}

function filterByGenre(movies: TMDBMovie[], genre: string) {
  if (!genre) return movies;
  const normalizedGenre = genre.toLowerCase();
  return movies.filter((movie) =>
    movie.genres.some((movieGenre) => movieGenre.toLowerCase() === normalizedGenre)
  );
}

async function getGenreResults(genre: string, type: ManualSearchType) {
  const genreIds = getGenreIdsByNames([genre]);
  if (genreIds.length === 0) return [];

  if (type === "movie") return discoverMoviesByGenres(genreIds);
  if (type === "tv") return discoverTVByGenres(genreIds);

  const [movies, series] = await Promise.all([
    discoverMoviesByGenres(genreIds),
    discoverTVByGenres(genreIds),
  ]);

  return [...movies, ...series];
}

async function getDefaultResults(type: ManualSearchType) {
  if (type === "movie") return getTrendingMovies();
  if (type === "tv") return getTrendingTV();

  const [movies, series] = await Promise.all([getTrendingMovies(), getTrendingTV()]);
  return [...movies, ...series];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() || "";
  const genre = searchParams.get("genre")?.trim() || "";
  const type = getType(searchParams.get("type"));

  const baseResults = query
    ? await searchMulti(query)
    : genre
      ? await getGenreResults(genre, type)
      : await getDefaultResults(type);

  const filtered = filterByGenre(
    filterByType(
      dedupeMovies(baseResults).filter((movie) => movie.poster_path && !movie.adult),
      type
    ),
    query ? genre : ""
  )
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 36)
    .map((movie, index) =>
      decorateMovie(
        movie,
        index,
        query
          ? `Manual match for "${query}".`
          : genre
            ? `Popular ${genre.toLowerCase()} ${type === "tv" ? "series" : type === "movie" ? "movies" : "titles"}.`
            : `Trending ${type === "tv" ? "series" : type === "movie" ? "movies" : "titles"} on TMDB.`
      )
    );

  return NextResponse.json({
    results: filtered,
    filters: { query, genre, type },
  });
}
