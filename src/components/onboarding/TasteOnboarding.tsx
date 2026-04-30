"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, Sparkles, X } from "lucide-react";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";
import { Movie } from "@/types/movie";
import { getClientId, trackEvent } from "@/utils/analytics";
import { MovieStorage } from "@/utils/movieStorage";

const STORAGE_KEY = "flickbuddyTasteOnboardingV1";
const MIN_SELECTIONS = 3;
const posterUrl = (path: string) => `https://image.tmdb.org/t/p/w500${path}`;

type Filter = "all" | "movie" | "tv";

const GENRES = [
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

function hasTasteSignals() {
  const liked = MovieStorage.getMoviesInList("Liked");
  const saved = MovieStorage.getMoviesInList("Saved");
  return liked.length + saved.length >= MIN_SELECTIONS;
}

function shouldShowOnboarding() {
  if (typeof window === "undefined") return false;
  const status = window.localStorage.getItem(STORAGE_KEY);
  return !status && !hasTasteSignals();
}

async function persistLike(movie: Movie) {
  await fetch("/api/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-flickbuddy-client-id": getClientId(),
    },
    body: JSON.stringify({ movie, action: "like" }),
  }).catch(() => undefined);
}

export function TasteOnboarding({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [starterMovies, setStarterMovies] = useState<Movie[]>([]);
  const [searchMovies, setSearchMovies] = useState<Movie[]>([]);
  const [selected, setSelected] = useState<Record<string, Movie>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const session = authClient.useSession();
  const isAuthed = Boolean(session.data?.user);

  useEffect(() => {
    if (!shouldShowOnboarding()) return;
    setOpen(true);
    setIsLoading(true);

    fetch("/api/onboarding", {
      headers: { "x-flickbuddy-client-id": getClientId() },
    })
      .then((response) => response.json())
      .then((data: { results?: Movie[] }) => {
        setStarterMovies(data.results || []);
        trackEvent("onboarding_shown", {
          metadata: { resultCount: data.results?.length || 0 },
        });
      })
      .catch((error) => {
        console.error(error);
        setOpen(false);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    const trimmedQuery = query.trim();
    const hasSearch = trimmedQuery.length > 0 || genre;

    if (!hasSearch) {
      setSearchMovies([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (trimmedQuery) params.set("query", trimmedQuery);
      if (genre) params.set("genre", genre);
      if (filter !== "all") params.set("type", filter);

      fetch(`/api/search?${params.toString()}`, {
        headers: { "x-flickbuddy-client-id": getClientId() },
      })
        .then((response) => response.json())
        .then((data: { results?: Movie[] }) => {
          setSearchMovies(data.results || []);
          trackEvent("onboarding_searched", {
            metadata: {
              query: trimmedQuery || null,
              genre: genre || null,
              type: filter,
              resultCount: data.results?.length || 0,
            },
          });
        })
        .catch((error) => {
          console.error(error);
          setSearchMovies([]);
        })
        .finally(() => setIsSearching(false));
    }, 320);

    return () => window.clearTimeout(timeout);
  }, [filter, genre, open, query]);

  const selectedMovies = useMemo(() => Object.values(selected), [selected]);
  const remainingCount = Math.max(MIN_SELECTIONS - selectedMovies.length, 0);
  const hasSearch = query.trim().length > 0 || genre;
  const visibleMovies = (hasSearch ? searchMovies : starterMovies).filter(
    (movie) => {
      if (filter === "all" || hasSearch) return true;
      return (movie.mediaType || "movie") === filter;
    }
  );

  const complete = async () => {
    if (selectedMovies.length < MIN_SELECTIONS) return;
    setIsSaving(true);

    selectedMovies.forEach((movie) => {
      MovieStorage.saveMovieState(movie.id, {
        isLiked: true,
        isDisliked: false,
      });
      MovieStorage.addToList(movie, "Liked");
    });

    if (isAuthed) {
      await Promise.all(selectedMovies.map(persistLike));
      void session.refetch();
    }

    window.localStorage.setItem(STORAGE_KEY, "completed");
    trackEvent("onboarding_completed", {
      metadata: {
        selectedCount: selectedMovies.length,
        authed: isAuthed,
        movieCount: selectedMovies.filter((movie) => movie.mediaType !== "tv")
          .length,
        seriesCount: selectedMovies.filter((movie) => movie.mediaType === "tv")
          .length,
      },
    });
    toast.success("Taste profile started.");
    setIsSaving(false);
    setOpen(false);
    onDone();
  };

  const skip = () => {
    window.localStorage.setItem(STORAGE_KEY, "skipped");
    trackEvent("onboarding_skipped", {
      metadata: { selectedCount: selectedMovies.length },
    });
    setOpen(false);
    onDone();
  };

  const toggleMovie = (movie: Movie) => {
    const key = `${movie.mediaType || "movie"}:${movie.id}`;
    setSelected((current) => {
      if (current[key]) {
        const next = { ...current };
        delete next[key];
        return next;
      }

      trackEvent("onboarding_title_selected", {
        movie,
        metadata: {
          selectedCount: Object.keys(current).length + 1,
          source: hasSearch ? "search" : "starter",
        },
      });
      return { ...current, [key]: movie };
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 text-white backdrop-blur-sm sm:items-center sm:p-5">
      <section className="flex h-dvh max-h-dvh w-full max-w-4xl flex-col overflow-hidden bg-[#071118] shadow-2xl shadow-black/60 sm:h-auto sm:max-h-[94dvh] sm:rounded-lg sm:border sm:border-white/10">
        <header className="flex shrink-0 items-start gap-3 border-b border-white/8 p-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:gap-4 sm:p-5">
          <div className="min-w-0 flex-1">
            <h2 className="mt-1 text-[clamp(1.35rem,6vw,1.75rem)] font-black leading-tight sm:text-2xl">
              Pick movies and series you already like.
            </h2>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-white/58 sm:mt-2 sm:leading-6">
              Choose at least {MIN_SELECTIONS}, to make the recommendations sharper.
            </p>
          </div>
          <button
            type="button"
            onClick={skip}
            aria-label="Skip onboarding"
            className="rounded-full p-2 text-white/45 transition hover:bg-white/8 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="shrink-0 border-b border-white/8 px-3 py-2 sm:px-5 sm:py-3">
          <label className="mb-2 flex h-11 items-center gap-3 rounded-md border border-white/10 bg-black/24 px-3 focus-within:border-cyan-300/60 sm:mb-3 sm:h-12">
            <Search className="h-5 w-5 shrink-0 text-white/42" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a title, actor, mood, or franchise"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/35"
            />
            {isSearching && (
              <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />
            )}
          </label>

          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2 overflow-x-auto">
              {[
                ["all", "All"],
                ["movie", "Movies"],
                ["tv", "Series"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value as Filter)}
                  className={`shrink-0 rounded-md px-3 py-2 text-xs font-black uppercase tracking-[0.1em] ${
                    filter === value
                      ? "bg-white text-black"
                      : "bg-white/[0.05] text-white/55"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="shrink-0 text-xs font-bold text-white/58">
              {selectedMovies.length} selected
            </p>
          </div>

          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 sm:mt-3">
            <button
              type="button"
              onClick={() => setGenre("")}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
                genre === ""
                  ? "border-cyan-300 bg-cyan-300 text-black"
                  : "border-white/10 bg-white/[0.04] text-white/58"
              }`}
            >
              Any genre
            </button>
            {GENRES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setGenre(item)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
                  genre === item
                    ? "border-cyan-300 bg-cyan-300 text-black"
                    : "border-white/10 bg-white/[0.04] text-white/58"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {selectedMovies.length > 0 && (
          <div className="shrink-0 border-b border-white/8 bg-cyan-300/[0.04] px-3 py-2 sm:px-5 sm:py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
                Your picks
              </p>
              <button
                type="button"
                onClick={() => setSelected({})}
                className="text-xs font-bold text-white/42 transition hover:text-white"
              >
                Clear all
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {selectedMovies.map((movie) => {
                const key = `${movie.mediaType || "movie"}:${movie.id}`;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleMovie(movie)}
                    className="flex w-44 shrink-0 items-center gap-2 rounded-md border border-cyan-300/25 bg-black/24 p-1.5 text-left"
                  >
                    <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded-sm bg-white/[0.05]">
                      <Image
                        src={posterUrl(movie.poster_path)}
                        alt=""
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-white">
                        {movie.title}
                      </p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-cyan-200/70">
                        {movie.mediaType === "tv" ? "Series" : "Movie"}
                      </p>
                    </div>
                    <X className="h-4 w-4 shrink-0 text-white/45" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          {isLoading || isSearching ? (
            <div className="flex min-h-80 items-center justify-center">
              <div className="flex items-center gap-3 text-sm font-bold text-white/65">
                <Loader2 className="h-5 w-5 animate-spin text-cyan-200" />
                {isSearching ? "Searching titles..." : "Loading popular picks..."}
              </div>
            </div>
          ) : visibleMovies.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {visibleMovies.map((movie) => {
                const key = `${movie.mediaType || "movie"}:${movie.id}`;
                const active = Boolean(selected[key]);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleMovie(movie)}
                    className={`group relative aspect-[2/3] overflow-hidden rounded-sm border text-left transition ${
                      active
                        ? "border-cyan-300 ring-2 ring-cyan-300/50"
                        : "border-white/8 bg-white/[0.04] hover:border-white/25"
                    }`}
                  >
                    <Image
                      src={posterUrl(movie.poster_path)}
                      alt={movie.title}
                      fill
                      sizes="(min-width: 1024px) 12vw, 33vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-transparent to-black/10" />
                    <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-black uppercase text-white/72">
                      {movie.mediaType === "tv" ? "Series" : "Movie"}
                    </span>
                    {active && (
                      <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-cyan-300 text-black">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                    <p className="absolute bottom-2 left-2 right-2 line-clamp-2 text-xs font-black leading-tight">
                      {movie.title}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-80 items-center justify-center text-center">
              <div>
                <p className="text-base font-black">No matches found</p>
                <p className="mt-2 text-sm text-white/55">
                  Try a title like Inception, a broader genre, or switch between
                  movies and series.
                </p>
              </div>
            </div>
          )}
        </div>

        <footer className="z-10 grid shrink-0 grid-cols-2 gap-2 border-t border-white/8 bg-[#071118]/96 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/50 backdrop-blur-xl sm:flex sm:items-center sm:justify-between sm:p-5">
          <button
            type="button"
            onClick={skip}
            className="order-2 rounded-md border border-white/10 px-4 py-3 text-sm font-bold text-white/62 transition hover:text-white sm:order-1"
          >
            Skip
          </button>
          <div className="order-1 col-span-2 text-center text-xs font-bold text-white/55 sm:order-2 sm:col-auto">
            {remainingCount > 0
              ? `Pick ${remainingCount} more to tune your feed`
              : `${selectedMovies.length} picks ready`}
          </div>
          <button
            type="button"
            onClick={complete}
            disabled={selectedMovies.length < MIN_SELECTIONS || isSaving}
            className="order-3 flex min-h-12 items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 py-3 text-sm font-black text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-48 sm:px-5"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Personalize feed
          </button>
        </footer>
      </section>
    </div>
  );
}
