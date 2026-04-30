"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode, TouchEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Heart,
  Loader2,
  MessageCircle,
  Play,
  Send,
  Star,
  Volume2,
  VolumeX,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { AppNav } from "@/components/AppNav";
import { AuthNudge } from "@/components/auth/AuthNudge";
import { BrandLink } from "@/components/BrandLogo";
import { FlickBuddyLoader } from "@/components/FilmRabbitLoader";
import { ListSelectionModal } from "@/components/ListSelectionModal";
import { TasteOnboarding } from "@/components/onboarding/TasteOnboarding";
import { authClient } from "@/lib/auth-client";
import { Movie, MovieReview } from "@/types/movie";
import { MovieStorage } from "@/utils/movieStorage";
import { getClientId, sendFeedback, trackEvent } from "@/utils/analytics";
import { shareOrCopy } from "@/utils/share";
import type { MovieInteractionAction } from "@/lib/user-movies";

interface FeedTastePayload {
  likedMovieIds: number[];
  dislikedMovieIds: number[];
  savedMovieIds: number[];
  watchedMovieIds: number[];
  likedSeeds: MediaSeed[];
  savedSeeds: MediaSeed[];
  likedGenres: string[];
  dislikedGenres: string[];
  excludeMovieIds: number[];
  excludeKeys?: string[];
  cursor?: number;
}

interface MediaSeed {
  id: number;
  mediaType: "movie" | "tv";
}

type RecommendationFeedback =
  | "good_pick"
  | "bad_pick"
  | "already_watched"
  | "not_available";

const posterUrl = (path: string) => `https://image.tmdb.org/t/p/w780${path}`;
const youtubeEmbedUrl = (key: string, muted: boolean) =>
  `https://www.youtube.com/embed/${key}?autoplay=1&mute=${muted ? "1" : "0"}&playsinline=1&controls=0&loop=1&playlist=${key}&rel=0&modestbranding=1&enablejsapi=1`;

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function movieKey(movie: Pick<Movie, "id" | "mediaType">) {
  return `${movie.mediaType === "tv" ? "tv" : "movie"}:${movie.id}`;
}

function readTastePayload(): FeedTastePayload {
  const lists = MovieStorage.getMovieLists();
  const statesRaw = localStorage.getItem("movieStates");
  const states = statesRaw
    ? (JSON.parse(statesRaw) as Record<
        string,
        {
          isLiked?: boolean;
          isDisliked?: boolean;
          isSeen?: boolean;
        }
      >)
    : {};

  const moviesById = new Map<number, Movie>();
  const moviesByKey = new Map<string, Movie>();
  lists.forEach((list) => {
    list.movies.forEach((movie) => {
      moviesById.set(movie.id, movie);
      moviesByKey.set(movieKey(movie), movie);
    });
  });

  const likedMovies = lists
    .filter((list) => list.name.includes("Liked"))
    .flatMap((list) => list.movies);
  const savedMovies = lists
    .filter((list) => list.name.includes("Saved"))
    .flatMap((list) => list.movies);
  const dislikedMovies = lists
    .filter((list) => list.name.includes("Not my taste"))
    .flatMap((list) => list.movies);

  const likedMovieIds = new Set(likedMovies.map((movie) => movie.id));
  const savedMovieIds = new Set(savedMovies.map((movie) => movie.id));
  const dislikedMovieIds = new Set(dislikedMovies.map((movie) => movie.id));
  const watchedMovieIds = new Set<number>();

  Object.entries(states).forEach(([movieId, state]) => {
    const id = Number(movieId);
    if (state.isLiked) likedMovieIds.add(id);
    if (state.isDisliked) dislikedMovieIds.add(id);
    if (state.isSeen) watchedMovieIds.add(id);
  });

  const likedGenres = likedMovies.flatMap((movie) => movie.genres || []);
  const dislikedGenres = dislikedMovies.flatMap((movie) => movie.genres || []);
  const toSeed = (movie: Movie): MediaSeed => ({
    id: movie.id,
    mediaType: movie.mediaType === "tv" ? "tv" : "movie",
  });

  return {
    likedMovieIds: Array.from(likedMovieIds),
    dislikedMovieIds: Array.from(dislikedMovieIds),
    savedMovieIds: Array.from(savedMovieIds),
    watchedMovieIds: Array.from(watchedMovieIds),
    likedSeeds: Array.from(
      new Map(likedMovies.map((movie) => [movieKey(movie), toSeed(movie)])).values()
    ),
    savedSeeds: Array.from(
      new Map(savedMovies.map((movie) => [movieKey(movie), toSeed(movie)])).values()
    ),
    likedGenres: Array.from(new Set(likedGenres)),
    dislikedGenres: Array.from(new Set(dislikedGenres)),
    excludeMovieIds: Array.from(moviesById.keys()),
    excludeKeys: Array.from(moviesByKey.keys()),
  };
}

export function MovieFeed() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReviews, setSelectedReviews] = useState<{
    movie: Movie;
    reviews: MovieReview[];
  } | null>(null);
  const [listMovie, setListMovie] = useState<Movie | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAITuning, setIsAITuning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shownKeysRef = useRef<Set<string>>(new Set());
  const cursorRef = useRef(0);
  const isLoadingRef = useRef(false);
  const moviesLengthRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const aiRefreshRef = useRef(false);
  const session = authClient.useSession();

  const activeMovie = movies[activeIndex];
  const isAuthed = !!session.data?.user;

  useEffect(() => {
    moviesLengthRef.current = movies.length;
  }, [movies.length]);

  const loadFeed = useCallback(async (append = false) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      if (!append) {
        setIsLoading(true);
        shownKeysRef.current = new Set();
        cursorRef.current = 0;
      }
      const payload = readTastePayload();
      const cursor = append ? cursorRef.current : 0;
      const response = await fetch("/api/feed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-flickbuddy-client-id": getClientId(),
        },
        body: JSON.stringify({
          ...payload,
          cursor,
          excludeKeys: Array.from(
            new Set([...(payload.excludeKeys || []), ...shownKeysRef.current])
          ),
        }),
      });

      if (!response.ok) {
        throw new Error("Feed request failed");
      }

      const data = (await response.json()) as {
        results: Movie[];
        nextCursor?: number;
      };
      trackEvent(append ? "feed_more_loaded" : "feed_loaded", {
        metadata: {
          resultCount: data.results?.length || 0,
          cursor,
        },
      });
      cursorRef.current =
        typeof data.nextCursor === "number" ? data.nextCursor : cursor + 1;
      setMovies((current) => {
        const existingKeys = append
          ? new Set(current.map(movieKey))
          : new Set<string>();
        const fresh = data.results.filter((movie) => {
          const key = movieKey(movie);
          if (existingKeys.has(key) || shownKeysRef.current.has(key)) return false;
          shownKeysRef.current.add(key);
          return true;
        });

        return append ? [...current, ...fresh] : fresh;
      });
    } catch (error) {
      console.error(error);
      toast.error("Could not load recommendations.");
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  const refreshFeed = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadFeed(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadFeed]);

  const refreshAIProfile = useCallback(
    async (force = false) => {
      if (!isAuthed || aiRefreshRef.current) return;
      aiRefreshRef.current = true;
      setIsAITuning(true);

      try {
        const response = await fetch("/api/feed/ai-profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-flickbuddy-client-id": getClientId(),
          },
          body: JSON.stringify({ force }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            refreshed?: boolean;
            profile?: unknown;
          };
          if (data.refreshed && moviesLengthRef.current > 0) {
            void loadFeed(true);
          }
        }
      } catch (error) {
        console.error("AI profile refresh failed", error);
      } finally {
        aiRefreshRef.current = false;
        setIsAITuning(false);
      }
    },
    [isAuthed, loadFeed]
  );

  useEffect(() => {
    void loadFeed(false);
  }, [loadFeed]);

  useEffect(() => {
    if (!isAuthed) return;
    void refreshAIProfile(false);
  }, [isAuthed, refreshAIProfile]);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;

    const nextIndex = Math.round(container.scrollTop / container.clientHeight);
    setActiveIndex(nextIndex);

    if (movies.length > 0 && nextIndex >= movies.length - 4) {
      void loadFeed(true);
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (!container || container.scrollTop > 2) {
      touchStartYRef.current = null;
      return;
    }

    touchStartYRef.current = event.touches[0].clientY;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartYRef.current === null || isRefreshing) return;
    const delta = event.changedTouches[0].clientY - touchStartYRef.current;
    touchStartYRef.current = null;

    if (delta > 72) {
      void refreshFeed();
      void refreshAIProfile(true);
    }
  };

  const requireAuth = () => {
    if (isAuthed) return true;
    setAuthOpen(true);
    return false;
  };

  const persistInteraction = async (
    movie: Movie,
    action: MovieInteractionAction,
    value?: number | null
  ) => {
    const response = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movie, action, value }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        setAuthOpen(true);
        return false;
      }
      throw new Error("Interaction failed");
    }

    return true;
  };

  const handleLike = async (movie: Movie) => {
    if (!requireAuth()) return;
    MovieStorage.saveMovieState(movie.id, {
      isLiked: true,
      isDisliked: false,
    });
    MovieStorage.addToList(movie, "Liked");
    sendFeedback({
      movie,
      feedback: "good_pick",
      source: "feed_like",
      metadata: { title: movie.title },
    });
    trackEvent("movie_liked", {
      movie,
      metadata: { source: "feed" },
    });
    await persistInteraction(movie, "like");
    toast.success("Tuned your feed toward this.");
    void loadFeed(true);
    void refreshAIProfile(true);
  };

  const handleDislike = async (movie: Movie) => {
    MovieStorage.saveMovieState(movie.id, {
      isLiked: false,
      isDisliked: true,
    });
    MovieStorage.addToList(movie, "Not my taste");
    sendFeedback({
      movie,
      feedback: "bad_pick",
      source: "feed_pass",
      metadata: { title: movie.title },
    });
    trackEvent("movie_disliked", {
      movie,
      metadata: { source: "feed" },
    });

    if (!isAuthed) {
      toast.success("We will show less like this.");
      void loadFeed(true);
      return;
    }

    await persistInteraction(movie, "dislike");
    toast.success("We will show less like this.");
    void loadFeed(true);
    void refreshAIProfile(true);
  };

  const handleSave = async (movie: Movie) => {
    if (!requireAuth()) return;
    trackEvent("save_started", {
      movie,
      metadata: { source: "feed" },
    });
    setListMovie(movie);
  };

  const handleShare = async (movie: Movie) => {
    if (!requireAuth()) return;
    const mediaType = movie.mediaType === "tv" ? "tv" : "movie";
    const url = `${window.location.origin}/share/movie/${movie.id}?type=${mediaType}`;
    const text = `I found ${movie.title} on FlickBuddy.`;

    try {
      const result = await shareOrCopy({
        title: movie.title,
        text,
        url,
      });
      if (result === "copied") toast.success("Share link copied.");
      trackEvent("movie_shared", {
        movie,
        metadata: { source: "feed", result },
      });
      await persistInteraction(movie, "share");
    } catch (error) {
      console.error(error);
      toast.error("Could not share this movie.");
    }
  };

  const handleFeedback = async (
    movie: Movie,
    feedback: RecommendationFeedback
  ) => {
    sendFeedback({
      movie,
      feedback,
      source: "feed_quick_feedback",
      metadata: { title: movie.title },
    });
    trackEvent("recommendation_feedback", {
      movie,
      metadata: { source: "feed", feedback },
    });

    if (feedback === "already_watched") {
      MovieStorage.saveMovieState(movie.id, { isSeen: true });
      if (isAuthed) {
        await persistInteraction(movie, "watch");
      }
    }

    toast.success("Feedback saved.");
  };

  if (isLoading && movies.length === 0) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#05080b] px-6 text-white">
        <FlickBuddyLoader
          size="lg"
          title="Building your movie feed..."
          message="FlickBuddy is reading your taste signals and lining up movies worth swiping through."
        />
      </main>
    );
  }

  return (
    <main className="min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,#172026_0,#05080b_46%,#020304_100%)] text-white">
      <Toaster position="top-center" />
      <div className="mx-auto flex min-h-dvh w-full max-w-[540px] flex-col lg:max-w-none">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="h-dvh snap-y snap-mandatory overflow-y-auto scroll-smooth lg:mx-auto lg:w-[540px]"
        >
          {(isRefreshing || isAITuning) && (
            <div className="pointer-events-none fixed left-1/2 top-5 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#0b1116]/90 px-4 py-2 text-xs font-bold text-white/78 shadow-2xl backdrop-blur">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />
              {isRefreshing ? "Refreshing picks" : "Tuning your feed"}
            </div>
          )}
          {movies.map((movie, index) => (
            <MovieFeedItem
              key={`${movie.id}-${index}`}
              movie={movie}
              isActive={index === activeIndex}
              onLike={handleLike}
              onDislike={handleDislike}
              onSave={handleSave}
              onShare={handleShare}
              onFeedback={handleFeedback}
              onShowReviews={(selectedMovie) =>
                setSelectedReviews({
                  movie: selectedMovie,
                  reviews: selectedMovie.reviews || [],
                })
              }
            />
          ))}
        </div>

        <AppNav />
      </div>

      {selectedReviews && (
        <ReviewsSheet
          movie={selectedReviews.movie}
          reviews={selectedReviews.reviews}
          onClose={() => setSelectedReviews(null)}
        />
      )}

      <AuthNudge
        open={authOpen}
        onOpenChange={setAuthOpen}
        onAuthed={() => {
          void session.refetch();
          void loadFeed(false);
        }}
      />

      <TasteOnboarding
        onDone={() => {
          void loadFeed(false);
          void refreshAIProfile(true);
        }}
      />

      {listMovie && (
        <ListSelectionModal
          movie={listMovie}
          open={!!listMovie}
          onOpenChange={(open) => {
            if (!open) setListMovie(null);
          }}
          onSaved={(list) => {
            MovieStorage.addToList(listMovie, list.name);
            void persistInteraction(listMovie, "save");
            trackEvent("movie_saved", {
              movie: listMovie,
              metadata: { source: "feed", listId: list.id, listName: list.name },
            });
            void loadFeed(true);
            void refreshAIProfile(true);
          }}
        />
      )}

      {activeMovie && (
        <div className="hidden lg:fixed lg:right-10 lg:top-10 lg:block lg:w-[340px]">
          <div className="rounded-md border border-cyan-300/20 bg-[#0b1116]/90 p-5 text-white shadow-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
              Taste Signal
            </p>
            <h2 className="mt-3 text-2xl font-semibold">{activeMovie.title}</h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              {activeMovie.feedReason}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs text-white/60">
              <div className="rounded-md bg-white/[0.04] p-3">
                <p className="text-lg font-semibold text-white">
                  {activeMovie.relevanceScore}%
                </p>
                <p>match</p>
              </div>
              <div className="rounded-md bg-white/[0.04] p-3">
                <p className="text-lg font-semibold text-white">
                  {activeMovie.reviews?.length || 0}
                </p>
                <p>reviews</p>
              </div>
              <div className="rounded-md bg-white/[0.04] p-3">
                <p className="text-lg font-semibold text-white">
                  {activeMovie.vote_average.toFixed(1)}
                </p>
                <p>rating</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function MovieFeedItem({
  movie,
  isActive,
  onLike,
  onDislike,
  onSave,
  onShare,
  onFeedback,
  onShowReviews,
}: {
  movie: Movie;
  isActive: boolean;
  onLike: (movie: Movie) => void;
  onDislike: (movie: Movie) => void;
  onSave: (movie: Movie) => void;
  onShare: (movie: Movie) => void;
  onFeedback: (movie: Movie, feedback: RecommendationFeedback) => void;
  onShowReviews: (movie: Movie) => void;
}) {
  const [isMuted, setIsMuted] = useState(true);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const releaseYear = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : "Unknown";
  const state = MovieStorage.getMovieState(movie.id);
  const hasLongOverview = movie.overview.length > 145;

  useEffect(() => {
    setIsMuted(true);
    setIsOverviewExpanded(false);
  }, [movie.id]);

  return (
    <article className="relative flex h-dvh snap-start snap-always flex-col justify-center overflow-hidden px-3 pb-24 pt-4">
      <div className="absolute inset-0 opacity-45 blur-3xl">
        <Image
          src={posterUrl(movie.poster_path)}
          alt=""
          fill
          sizes="100vw"
          className="scale-125 object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between rounded-md border border-white/10 bg-[#070b0f]/72 p-3 shadow-2xl shadow-black/60 backdrop-blur-sm">
        <header className="flex items-start justify-between">
          <div>
            <BrandLink className="text-xl" />
            <div className="mt-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200/80">
              <span>For You</span>
              <span>{movie.relevanceScore}%</span>
            </div>
          </div>
          <button
            onClick={() => onDislike(movie)}
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:border-red-300/60"
          >
            Pass
          </button>
        </header>

        <div className="relative my-3 min-h-0 flex-1 overflow-hidden rounded-sm border border-white/10 bg-black">
          {movie.trailerKey && isActive ? (
            <iframe
              title={`${movie.title} trailer`}
              src={youtubeEmbedUrl(movie.trailerKey, isMuted)}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="h-full w-full scale-125 border-0"
            />
          ) : (
            <Image
              src={posterUrl(movie.poster_path)}
              alt={movie.title}
              fill
              priority={isActive}
              sizes="(min-width: 1024px) 520px, 100vw"
              className="object-cover"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/90 to-transparent" />
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1 text-xs backdrop-blur">
            <Play className="h-4 w-4" />
            <span>{movie.trailerKey ? "Trailer" : "Poster"}</span>
          </div>
          {movie.trailerKey && isActive && (
            <button
              type="button"
              onClick={() => {
                setIsMuted((current) => !current);
                trackEvent(isMuted ? "trailer_unmuted" : "trailer_muted", {
                  movie,
                  metadata: { source: "feed" },
                });
              }}
              className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-black/65 px-3 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-black/80"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              {isMuted ? "Unmute" : "Mute"}
            </button>
          )}
        </div>

        <section>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-cyan-300 px-2.5 py-1 text-xs font-bold text-black">
              {releaseYear}
            </span>
            <span className="flex items-center gap-1 text-sm text-white/80">
              <Star className="h-4 w-4 fill-yellow-300 text-yellow-300" />
              {movie.vote_average.toFixed(1)}
            </span>
            {movie.trailerKey && (
              <span className="flex items-center gap-1 text-sm text-white/60">
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
                {isMuted ? "muted" : "sound on"}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold leading-tight">{movie.title}</h1>
          <p className="mt-2 text-sm text-cyan-100/75">
            {movie.genres.slice(0, 3).join(" / ")}
          </p>
          <div className="mt-3 text-sm leading-5 text-white/82">
            <p className={isOverviewExpanded ? "" : "line-clamp-3"}>
              {movie.overview}
            </p>
            {hasLongOverview && (
              <button
                type="button"
                onClick={() => {
                  setIsOverviewExpanded((current) => !current);
                  trackEvent(
                    isOverviewExpanded
                      ? "overview_collapsed"
                      : "overview_expanded",
                    {
                      movie,
                      metadata: { source: "feed" },
                    }
                  );
                }}
                className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-cyan-200"
              >
                {isOverviewExpanded ? "See less" : "See more"}
              </button>
            )}
          </div>
          <p className="mt-3 rounded-sm border-l-2 border-cyan-300 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-white">
            {movie.feedReason}
          </p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {[
              ["good_pick", "Good pick"],
              ["already_watched", "Seen"],
              ["not_available", "Unavailable"],
            ].map(([feedback, label]) => (
              <button
                key={feedback}
                type="button"
                onClick={() =>
                  onFeedback(movie, feedback as RecommendationFeedback)
                }
                className="shrink-0 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/68 transition hover:border-cyan-300/40 hover:text-white"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <aside className="mt-4 grid grid-cols-4 gap-2">
          <FeedAction
            active={state.isLiked}
            icon={<Heart className="h-5 w-5" fill={state.isLiked ? "currentColor" : "none"} />}
            label={compactNumber(movie.vote_count)}
            onClick={() => onLike(movie)}
          />
          <FeedAction
            icon={<MessageCircle className="h-5 w-5" />}
            label={`${movie.reviews?.length || 0} reviews`}
            onClick={() => onShowReviews(movie)}
          />
          <FeedAction
            icon={<Send className="h-5 w-5" />}
            label="share"
            onClick={() => onShare(movie)}
          />
          <FeedAction
            active={state.lists?.includes("Saved")}
            icon={
              <Bookmark
                className="h-5 w-5"
                fill={state.lists?.includes("Saved") ? "currentColor" : "none"}
              />
            }
            label="save"
            onClick={() => onSave(movie)}
          />
        </aside>
      </div>
    </article>
  );
}

function FeedAction({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-sm border px-1 text-white transition ${
        active
          ? "border-cyan-300 bg-cyan-300/15 text-cyan-200"
          : "border-white/10 bg-white/[0.04] hover:border-white/30"
      }`}
    >
      {icon}
      <span className="max-w-full truncate text-[10px] font-semibold uppercase tracking-[0.08em]">
        {label}
      </span>
    </button>
  );
}

function ReviewsSheet({
  movie,
  reviews,
  onClose,
}: {
  movie: Movie;
  reviews: MovieReview[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <button className="absolute inset-0 cursor-default" onClick={onClose} />
      <section className="relative max-h-[72dvh] w-full max-w-[520px] overflow-y-auto rounded-t-lg bg-[#11161c] p-5 text-white shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/25" />
        <h2 className="text-lg font-semibold">Reviews for {movie.title}</h2>
        <div className="mt-5 space-y-5">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <article key={review.id} className="border-b border-white/10 pb-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-semibold">{review.author}</p>
                  {review.rating && (
                    <span className="text-xs text-cyan-300">
                      {review.rating}/10
                    </span>
                  )}
                </div>
                <p className="line-clamp-6 text-sm leading-6 text-white/75">
                  {review.content}
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm text-white/65">
              No public reviews are available yet. This will become app comments
              once user accounts are added.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
