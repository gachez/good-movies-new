"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Search, SlidersHorizontal, Star } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { FlickBuddyLoader } from "@/components/FlickBuddyLoader";
import { Movie } from "@/types/movie";

const posterUrl = (path: string) => `https://image.tmdb.org/t/p/w500${path}`;

const mediaTypes = [
  { label: "All", value: "all" },
  { label: "Movies", value: "movie" },
  { label: "Series", value: "tv" },
] as const;

const genres = [
  "All",
  "Action",
  "Animation",
  "Comedy",
  "Crime",
  "Drama",
  "Horror",
  "Mystery",
  "Romance",
  "Science Fiction",
  "Thriller",
];

type MediaType = (typeof mediaTypes)[number]["value"];

interface SearchResponse {
  results: Movie[];
  filters: {
    query: string;
    genre: string;
    type: MediaType;
  };
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<MediaType>("all");
  const [genre, setGenre] = useState("All");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMovies = useCallback(
    async (nextQuery: string, nextType: MediaType, nextGenre: string) => {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (nextQuery.trim()) params.set("query", nextQuery.trim());
      if (nextType !== "all") params.set("type", nextType);
      if (nextGenre !== "All") params.set("genre", nextGenre);

      try {
        const response = await fetch(`/api/search?${params.toString()}`);
        const data = (await response.json()) as SearchResponse;
        setMovies(data.results || []);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadMovies(query, type, genre);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query, type, genre, loadMovies]);

  return (
    <main className="min-h-dvh bg-[#05080b] pb-24 text-white">
      <section className="sticky top-0 z-30 border-b border-white/5 bg-[#05080b]/95 px-4 pb-4 pt-5 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-3">
            <label className="flex h-14 flex-1 items-center gap-3 rounded-md bg-white/[0.08] px-4">
              <Search className="h-6 w-6 text-white/45" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search titles"
                className="min-w-0 flex-1 bg-transparent text-lg font-medium text-white outline-none placeholder:text-white/40"
              />
            </label>
            <Link
              href="/discover"
              className="flex h-14 w-14 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]"
              aria-label="Open smart discovery"
            >
              <SlidersHorizontal className="h-6 w-6 text-cyan-200" />
            </Link>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {mediaTypes.map((mediaType) => (
              <button
                key={mediaType.value}
                onClick={() => setType(mediaType.value)}
                className={`shrink-0 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] ${
                  type === mediaType.value
                    ? "bg-white text-black"
                    : "bg-white/[0.04] text-white/55"
                }`}
              >
                {mediaType.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {genres.map((item) => (
              <button
                key={item}
                onClick={() => setGenre(item)}
                className={`shrink-0 rounded-full border px-5 py-2 text-sm font-bold ${
                  genre === item
                    ? "border-cyan-300 bg-cyan-300 text-black"
                    : "border-white/15 bg-white/[0.03] text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl">
        {isLoading && movies.length === 0 ? (
          <SkeletonGrid />
        ) : movies.length > 0 ? (
          <ResultGrid movies={movies} />
        ) : (
          <EmptyState />
        )}
      </section>

      <AppNav />
    </main>
  );
}

function SkeletonGrid() {
  return (
    <div className="space-y-4 p-1">
      <div className="mx-3 rounded-md border border-cyan-300/15 bg-[#071118] px-4 py-5">
        <FlickBuddyLoader
          size="sm"
          title="Searching the collection..."
          message="FlickBuddy is checking titles, genres, and series before the posters appear."
        />
      </div>
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 18 }).map((_, index) => (
          <div
            key={index}
            className="aspect-[2/3] animate-pulse bg-cyan-300/8"
          />
        ))}
      </div>
    </div>
  );
}

function ResultGrid({ movies }: { movies: Movie[] }) {
  return (
    <div className="grid grid-cols-3 gap-1 p-1 sm:grid-cols-4 lg:grid-cols-6">
      {movies.map((movie) => (
        <Link
          key={`${movie.mediaType || "movie"}-${movie.id}`}
          href={`/movie/${movie.id}?type=${movie.mediaType === "tv" ? "tv" : "movie"}`}
          className="group relative aspect-[2/3] overflow-hidden bg-white/[0.04]"
        >
          <Image
            src={posterUrl(movie.poster_path)}
            alt={movie.title}
            fill
            sizes="(min-width: 1024px) 16vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
          <div className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[11px] font-bold backdrop-blur">
            {compactNumber(movie.popularity * 1000)}
          </div>
          <div className="absolute right-2 top-2 rounded-full bg-cyan-300 px-2 py-1 text-[10px] font-bold uppercase text-black">
            {movie.mediaType === "tv" ? "Series" : "Movie"}
          </div>
          <div className="absolute bottom-2 left-2 right-2">
            <p className="line-clamp-2 text-xs font-bold leading-tight">
              {movie.title}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-white/70">
              <Star className="h-3 w-3 fill-yellow-300 text-yellow-300" />
              {movie.vote_average.toFixed(1)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-20 text-center">
      <p className="text-lg font-bold">No matches found</p>
      <p className="mt-2 text-sm text-white/55">
        Try a title, choose a genre, or switch to Discover for free-text prompts.
      </p>
    </div>
  );
}
