"use client";

import Image from "next/image";
import type {
  PointerEvent as ReactPointerEvent,
  ReactNode,
  TouchEvent,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Heart,
  Loader2,
  MessageCircle,
  Play,
  Send,
  Star,
  ThumbsDown,
  Volume2,
  VolumeX,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { AppNav } from "@/components/AppNav";
import { AuthNudge } from "@/components/auth/AuthNudge";
import { BrandLink } from "@/components/BrandLogo";
import { FlickBuddyLoader } from "@/components/FilmRabbitLoader";
import { ListSelectionModal } from "@/components/ListSelectionModal";
import {
  shouldShowTasteOnboarding,
  TasteOnboarding,
} from "@/components/onboarding/TasteOnboarding";
import { authClient } from "@/lib/auth-client";
import { Movie, MovieReview, MovieState } from "@/types/movie";
import { MovieStorage } from "@/utils/movieStorage";
import { getClientId, sendFeedback, trackEvent } from "@/utils/analytics";
import { shareOrCopy } from "@/utils/share";
import {
  addAvoidPreferences,
  AvoidPreferences,
  readAvoidPreferences,
  saveAvoidPreferences,
} from "@/utils/tastePreferences";
import type { MovieInteractionAction } from "@/lib/user-movies";

interface FeedTastePayload {
  likedMovieIds: number[];
  dislikedMovieIds: number[];
  savedMovieIds: number[];
  watchedMovieIds: number[];
  likedSeeds: MediaSeed[];
  savedSeeds: MediaSeed[];
  likedSnapshots: TasteMovieSnapshot[];
  savedSnapshots: TasteMovieSnapshot[];
  dislikedSnapshots: TasteMovieSnapshot[];
  likedGenres: string[];
  dislikedGenres: string[];
  avoidedGenres: string[];
  avoidTerms: string[];
  excludeMovieIds: number[];
  excludeKeys?: string[];
  cursor?: number;
}

interface MediaSeed {
  id: number;
  mediaType: "movie" | "tv";
}

interface TasteMovieSnapshot {
  id: number;
  title: string;
  overview: string;
  genres: string[];
  mediaType: "movie" | "tv";
  release_date?: string;
  vote_average?: number;
  popularity?: number;
}

type RecommendationFeedback =
  | "good_pick"
  | "bad_pick"
  | "already_watched"
  | "not_available";

const posterUrl = (path: string) => `https://image.tmdb.org/t/p/w780${path}`;
const youtubeEmbedUrl = (key: string) =>
  `https://www.youtube.com/embed/${key}?autoplay=1&mute=1&playsinline=1&controls=0&loop=1&playlist=${key}&rel=0&modestbranding=1&enablejsapi=1`;

const DOUBLE_TAP_DELAY_MS = 300;
const DOUBLE_TAP_DISTANCE_PX = 48;
const TAP_MOVE_TOLERANCE_PX = 18;
const INITIAL_FEED_CURSOR_SPREAD = 20;
const MIN_APPEND_BATCH_SIZE = 8;
const MAX_APPEND_LOAD_ATTEMPTS = 3;
const LOCAL_TASTE_SYNC_KEY_PREFIX = "flickbuddyTasteSyncedUser";
const ANONYMOUS_TASTE_SIGNAL_COUNT_KEY = "flickbuddyAnonymousTasteSignalCount";
const ANONYMOUS_ACTION_NUDGE_THRESHOLD = 3;
const ANONYMOUS_VIEW_NUDGE_THRESHOLD = 5;

interface TapPoint {
  x: number;
  y: number;
  time: number;
}

interface LocalTasteInteraction {
  movie: Movie;
  action: Extract<MovieInteractionAction, "like" | "dislike" | "save">;
}

function getDistance(a: Pick<TapPoint, "x" | "y">, b: Pick<TapPoint, "x" | "y">) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "button,a,input,textarea,select,summary,[role='button'],[data-double-tap-ignore='true']"
    )
  );
}

function sendYouTubeCommand(
  iframe: HTMLIFrameElement | null,
  func: "mute" | "unMute" | "playVideo"
) {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: "command", func, args: [] }),
    "https://www.youtube.com"
  );
}

function syncYouTubeAudio(iframe: HTMLIFrameElement | null, muted: boolean) {
  sendYouTubeCommand(iframe, muted ? "mute" : "unMute");
  sendYouTubeCommand(iframe, "playVideo");
}

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
  const avoidPreferences = readAvoidPreferences();
  const toSeed = (movie: Movie): MediaSeed => ({
    id: movie.id,
    mediaType: movie.mediaType === "tv" ? "tv" : "movie",
  });
  const toSnapshot = (movie: Movie): TasteMovieSnapshot => ({
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    genres: movie.genres || [],
    mediaType: movie.mediaType === "tv" ? "tv" : "movie",
    release_date: movie.release_date,
    vote_average: movie.vote_average,
    popularity: movie.popularity,
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
    likedSnapshots: Array.from(
      new Map(likedMovies.map((movie) => [movieKey(movie), toSnapshot(movie)])).values()
    ).slice(0, 24),
    savedSnapshots: Array.from(
      new Map(savedMovies.map((movie) => [movieKey(movie), toSnapshot(movie)])).values()
    ).slice(0, 24),
    dislikedSnapshots: Array.from(
      new Map(dislikedMovies.map((movie) => [movieKey(movie), toSnapshot(movie)])).values()
    ).slice(0, 24),
    likedGenres: Array.from(new Set(likedGenres)),
    dislikedGenres: Array.from(new Set(dislikedGenres)),
    avoidedGenres: avoidPreferences.genres,
    avoidTerms: avoidPreferences.terms,
    excludeMovieIds: Array.from(moviesById.keys()),
    excludeKeys: Array.from(moviesByKey.keys()),
  };
}

function readLocalTasteInteractions() {
  const interactions = new Map<string, LocalTasteInteraction>();
  const listActions: Array<{
    matches: (name: string) => boolean;
    action: LocalTasteInteraction["action"];
  }> = [
    { matches: (name) => name.includes("Liked"), action: "like" },
    { matches: (name) => name.includes("Saved"), action: "save" },
    { matches: (name) => name.includes("Not my taste"), action: "dislike" },
  ];

  MovieStorage.getMovieLists().forEach((list) => {
    const action = listActions.find(({ matches }) => matches(list.name))?.action;
    if (!action) return;

    list.movies.forEach((movie) => {
      interactions.set(`${action}:${movieKey(movie)}`, { movie, action });
    });
  });

  return Array.from(interactions.values()).slice(0, 120);
}

async function syncLocalTasteToAccount(userId: string) {
  if (typeof window === "undefined") return false;

  const syncKey = `${LOCAL_TASTE_SYNC_KEY_PREFIX}:${userId}`;
  if (window.localStorage.getItem(syncKey) === "1") return false;

  const interactions = readLocalTasteInteractions();
  const localAvoids = readAvoidPreferences();
  let preferencesSynced = false;

  if (localAvoids.genres.length > 0 || localAvoids.terms.length > 0) {
    const remoteResponse = await fetch("/api/taste-preferences", {
      headers: { "x-flickbuddy-client-id": getClientId() },
    }).catch(() => null);
    const remoteData =
      remoteResponse?.ok
        ? ((await remoteResponse.json().catch(() => null)) as {
            preferences?: AvoidPreferences;
          } | null)
        : null;
    const mergedAvoids = addAvoidPreferences(
      localAvoids,
      remoteData?.preferences || null
    );

    const saveResponse = await fetch("/api/taste-preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-flickbuddy-client-id": getClientId(),
      },
      body: JSON.stringify(mergedAvoids),
    }).catch(() => null);

    if (saveResponse?.ok) {
      preferencesSynced = true;
      saveAvoidPreferences(mergedAvoids);
    }
  }

  if (interactions.length === 0) {
    window.localStorage.setItem(syncKey, "1");
    return preferencesSynced;
  }

  const results = await Promise.allSettled(
    interactions.map(({ movie, action }) =>
      fetch("/api/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-flickbuddy-client-id": getClientId(),
        },
        body: JSON.stringify({ movie, action }),
      })
    )
  );
  const syncedCount = results.filter(
    (result) => result.status === "fulfilled" && result.value.ok
  ).length;

  if (syncedCount === interactions.length) {
    window.localStorage.setItem(syncKey, "1");
  }

  if (syncedCount > 0 || preferencesSynced) {
    trackEvent("local_taste_synced", {
      metadata: {
        syncedCount,
        attemptedCount: interactions.length,
        preferencesSynced,
      },
    });
  }

  return syncedCount > 0 || preferencesSynced;
}

export function MovieFeed() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);
  const [isOnboardingGateOpen, setIsOnboardingGateOpen] = useState(false);
  const [selectedReviews, setSelectedReviews] = useState<{
    movie: Movie;
    reviews: MovieReview[];
  } | null>(null);
  const [listMovie, setListMovie] = useState<Movie | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [authPrompt, setAuthPrompt] = useState({
    title: "Save your taste profile",
    description:
      "Create an account to keep your picks, likes, saves, and recommendations.",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAITuning, setIsAITuning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shownKeysRef = useRef<Set<string>>(new Set());
  const cursorRef = useRef(0);
  const isLoadingRef = useRef(false);
  const moviesLengthRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const aiRefreshRef = useRef(false);
  const syncedUserRef = useRef<string | null>(null);
  const authNudgeShownRef = useRef(false);
  const anonymousViewedKeysRef = useRef<Set<string>>(new Set());
  const session = authClient.useSession();

  const activeMovie = movies[activeIndex];
  const isAuthed = !!session.data?.user;
  const userId = session.data?.user?.id;

  useEffect(() => {
    moviesLengthRef.current = movies.length;
  }, [movies.length]);

  const loadFeed = useCallback(async (append = false) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      let cursor = append
        ? cursorRef.current
        : Math.floor(Math.random() * INITIAL_FEED_CURSOR_SPREAD);
      if (!append) {
        setIsLoading(true);
        setActiveIndex(0);
        shownKeysRef.current = new Set();
        cursorRef.current = cursor;
      }
      const payload = readTastePayload();
      const excludedKeys = new Set([
        ...(payload.excludeKeys || []),
        ...shownKeysRef.current,
      ]);
      const collected: Movie[] = [];
      const maxAttempts = append ? MAX_APPEND_LOAD_ATTEMPTS : 1;
      let attemptedCursors: number[] = [];

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        attemptedCursors = [...attemptedCursors, cursor];
        const response = await fetch("/api/feed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-flickbuddy-client-id": getClientId(),
          },
          body: JSON.stringify({
            ...payload,
            cursor,
            skipStoryRerank: append && attempt > 0,
            excludeKeys: Array.from(excludedKeys),
          }),
        });

        if (!response.ok) {
          throw new Error("Feed request failed");
        }

        const data = (await response.json()) as {
          results: Movie[];
          nextCursor?: number;
        };
        cursor =
          typeof data.nextCursor === "number" ? data.nextCursor : cursor + 1;
        cursorRef.current = cursor;

        const fresh = (data.results || []).filter((movie) => {
          const key = movieKey(movie);
          if (excludedKeys.has(key)) return false;
          excludedKeys.add(key);
          return true;
        });

        collected.push(...fresh);

        if (!append || collected.length >= MIN_APPEND_BATCH_SIZE) {
          break;
        }
      }

      trackEvent(append ? "feed_more_loaded" : "feed_loaded", {
        metadata: {
          resultCount: collected.length,
          cursor: attemptedCursors[0],
          attempts: attemptedCursors.length,
        },
      });

      if (append && collected.length === 0) {
        trackEvent("feed_more_empty", {
          metadata: { cursors: attemptedCursors },
        });
      }

      collected.forEach((movie) => shownKeysRef.current.add(movieKey(movie)));

      setMovies((current) => {
        const existingKeys = append
          ? new Set(current.map(movieKey))
          : new Set<string>();
        const fresh = collected.filter((movie) => {
          const key = movieKey(movie);
          if (existingKeys.has(key)) return false;
          existingKeys.add(key);
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

  const openAuthNudge = useCallback(
    ({
      source,
      title = "Save your taste profile",
      description = "Create an account to keep your picks, likes, saves, and recommendations.",
      force = false,
    }: {
      source: string;
      title?: string;
      description?: string;
      force?: boolean;
    }) => {
      if (isAuthed) return;
      if (authNudgeShownRef.current && !force) return;

      authNudgeShownRef.current = true;
      setAuthMode("signup");
      setAuthPrompt({ title, description });
      setAuthOpen(true);
      trackEvent("auth_nudge_shown", {
        metadata: { source },
      });
    },
    [isAuthed]
  );

  const recordAnonymousTasteSignal = useCallback(
    (
      movie: Movie,
      signal: "like" | "dislike" | "save" | "watch",
      threshold = ANONYMOUS_ACTION_NUDGE_THRESHOLD
    ) => {
      if (isAuthed || typeof window === "undefined") return;

      const current = Number(
        window.localStorage.getItem(ANONYMOUS_TASTE_SIGNAL_COUNT_KEY) || "0"
      );
      const next = Number.isFinite(current) ? current + 1 : 1;
      window.localStorage.setItem(
        ANONYMOUS_TASTE_SIGNAL_COUNT_KEY,
        String(next)
      );

      trackEvent("anonymous_taste_signal_recorded", {
        movie,
        metadata: { signal, signalCount: next },
      });

      if (next >= threshold) {
        openAuthNudge({
          source: "anonymous_action_threshold",
          description:
            "Your feed is learning from these actions. Create an account to keep the profile going.",
        });
      }
    },
    [isAuthed, openAuthNudge]
  );

  useEffect(() => {
    const needsOnboarding = shouldShowTasteOnboarding();
    setIsOnboardingGateOpen(needsOnboarding);
    setHasCheckedOnboarding(true);

    if (!needsOnboarding) {
      void loadFeed(false);
    }
  }, [loadFeed]);

  const handleOnboardingDone = useCallback(() => {
    setIsOnboardingGateOpen(false);
    void loadFeed(false);
    void refreshAIProfile(true);
  }, [loadFeed, refreshAIProfile]);

  useEffect(() => {
    if (!isAuthed) return;
    void refreshAIProfile(false);
  }, [isAuthed, refreshAIProfile]);

  useEffect(() => {
    if (!userId || syncedUserRef.current === userId) return;
    syncedUserRef.current = userId;

    void syncLocalTasteToAccount(userId)
      .then((synced) => {
        if (!synced) return;
        void loadFeed(false);
        void refreshAIProfile(true);
      })
      .catch((error) => {
        console.error("Local taste sync failed", error);
        syncedUserRef.current = null;
      });
  }, [loadFeed, refreshAIProfile, userId]);

  useEffect(() => {
    if (!activeMovie || isAuthed) return;

    const key = movieKey(activeMovie);
    if (anonymousViewedKeysRef.current.has(key)) return;

    anonymousViewedKeysRef.current.add(key);
    const viewCount = anonymousViewedKeysRef.current.size;

    trackEvent("anonymous_feed_title_viewed", {
      movie: activeMovie,
      metadata: { viewCount },
    });

    if (viewCount >= ANONYMOUS_VIEW_NUDGE_THRESHOLD) {
      openAuthNudge({
        source: "anonymous_feed_view_threshold",
        description:
          "Your recommendations are already being shaped by what you browse. Create an account to keep this taste profile.",
      });
    }
  }, [activeMovie, isAuthed, openAuthNudge]);

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
    openAuthNudge({
      source: "protected_action",
      title: "Keep your FlickBuddy profile",
      description:
        "Sign in or create an account to keep your taste profile, lists, and recommendations.",
      force: true,
    });
    return false;
  };

  const persistInteraction = async (
    movie: Movie,
    action: MovieInteractionAction,
    value?: number | null
  ) => {
    const response = await fetch("/api/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-flickbuddy-client-id": getClientId(),
      },
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

    if (!isAuthed) {
      toast.success("Tuned your feed toward this.");
      recordAnonymousTasteSignal(movie, "like");
      void loadFeed(true);
      return;
    }

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
      recordAnonymousTasteSignal(movie, "dislike");
      void loadFeed(true);
      return;
    }

    await persistInteraction(movie, "dislike");
    toast.success("We will show less like this.");
    void loadFeed(true);
    void refreshAIProfile(true);
  };

  const handleSave = async (movie: Movie) => {
    trackEvent("save_started", {
      movie,
      metadata: { source: "feed" },
    });

    if (!isAuthed) {
      MovieStorage.addToList(movie, "Saved");
      toast.success("Saved locally.");
      trackEvent("movie_saved", {
        movie,
        metadata: { source: "feed", storage: "local" },
      });
      recordAnonymousTasteSignal(movie, "save");
      void loadFeed(true);
      return;
    }

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
      } else {
        recordAnonymousTasteSignal(movie, "watch");
      }
      void loadFeed(true);
    }

    toast.success("Feedback saved.");
  };

  if (
    !hasCheckedOnboarding ||
    (isLoading && movies.length === 0 && !isOnboardingGateOpen)
  ) {
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
        initialMode={authMode}
        title={authPrompt.title}
        description={authPrompt.description}
        onAuthed={() => {
          void session.refetch();
          void loadFeed(false);
        }}
      />

      <TasteOnboarding
        onDone={handleOnboardingDone}
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
  onLike: (movie: Movie) => void | Promise<void>;
  onDislike: (movie: Movie) => void | Promise<void>;
  onSave: (movie: Movie) => void | Promise<void>;
  onShare: (movie: Movie) => void | Promise<void>;
  onFeedback: (
    movie: Movie,
    feedback: RecommendationFeedback
  ) => void | Promise<void>;
  onShowReviews: (movie: Movie) => void;
}) {
  const [isMuted, setIsMuted] = useState(true);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [likeBurstKey, setLikeBurstKey] = useState(0);
  const [optimisticState, setOptimisticState] = useState<MovieState>(() =>
    MovieStorage.getMovieState(movie.id)
  );
  const trailerRef = useRef<HTMLIFrameElement>(null);
  const pointerStartRef = useRef<Pick<TapPoint, "x" | "y"> | null>(null);
  const lastTapRef = useRef<TapPoint | null>(null);
  const likeBurstTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const releaseYear = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : "Unknown";
  const hasLongOverview = movie.overview.length > 145;

  useEffect(() => {
    setIsMuted(true);
    setIsOverviewExpanded(false);
    setLikeBurstKey(0);
    setOptimisticState(MovieStorage.getMovieState(movie.id));
    lastTapRef.current = null;
  }, [movie.id]);

  useEffect(() => {
    if (!isActive || !movie.trailerKey) return;
    const timer = setTimeout(() => {
      syncYouTubeAudio(trailerRef.current, isMuted);
    }, 250);

    return () => clearTimeout(timer);
  }, [isActive, isMuted, movie.trailerKey]);

  useEffect(() => {
    return () => {
      if (likeBurstTimeoutRef.current) {
        clearTimeout(likeBurstTimeoutRef.current);
      }
    };
  }, []);

  const triggerLikeBurst = () => {
    setLikeBurstKey((current) => current + 1);
    if (likeBurstTimeoutRef.current) clearTimeout(likeBurstTimeoutRef.current);
    likeBurstTimeoutRef.current = setTimeout(() => {
      setLikeBurstKey(0);
    }, 650);
  };

  const applyOptimisticState = (state: Partial<MovieState>) => {
    setOptimisticState((current) => ({
      ...current,
      ...state,
      lists: state.lists ?? current.lists,
      lastModified: new Date().toISOString(),
    }));
  };

  const handleLikeAction = async () => {
    const previousState = optimisticState;
    applyOptimisticState({
      isLiked: true,
      isDisliked: false,
    });

    try {
      await onLike(movie);
    } catch (error) {
      console.error(error);
      setOptimisticState(previousState);
      toast.error("Could not save that feedback.");
    }
  };

  const handleDislikeAction = async () => {
    const previousState = optimisticState;
    applyOptimisticState({
      isLiked: false,
      isDisliked: true,
    });

    try {
      await onDislike(movie);
    } catch (error) {
      console.error(error);
      setOptimisticState(previousState);
      toast.error("Could not save that feedback.");
    }
  };

  const handleSaveAction = async () => {
    const previousState = optimisticState;
    applyOptimisticState({
      lists: Array.from(new Set([...(optimisticState.lists || []), "Saved"])),
    });

    try {
      await onSave(movie);
    } catch (error) {
      console.error(error);
      setOptimisticState(previousState);
      toast.error("Could not save this title.");
    }
  };

  const handleFeedbackAction = async (feedback: RecommendationFeedback) => {
    const previousState = optimisticState;
    if (feedback === "already_watched") {
      applyOptimisticState({ isSeen: true });
    }

    try {
      await onFeedback(movie, feedback);
    } catch (error) {
      console.error(error);
      setOptimisticState(previousState);
      toast.error("Could not save that feedback.");
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!event.isPrimary || isInteractiveTarget(event.target)) {
      pointerStartRef.current = null;
      return;
    }

    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (!event.isPrimary || !pointerStartRef.current) {
      return;
    }

    if (isInteractiveTarget(event.target)) {
      pointerStartRef.current = null;
      return;
    }

    const tapPoint = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now(),
    };
    const moveDistance = getDistance(pointerStartRef.current, tapPoint);
    pointerStartRef.current = null;

    if (moveDistance > TAP_MOVE_TOLERANCE_PX) return;

    const lastTap = lastTapRef.current;
    if (
      lastTap &&
      tapPoint.time - lastTap.time <= DOUBLE_TAP_DELAY_MS &&
      getDistance(lastTap, tapPoint) <= DOUBLE_TAP_DISTANCE_PX
    ) {
      lastTapRef.current = null;
      triggerLikeBurst();
      trackEvent("movie_double_tapped", {
        movie,
        metadata: { source: "feed" },
      });
      void handleLikeAction();
      return;
    }

    lastTapRef.current = tapPoint;
  };

  const handlePointerCancel = () => {
    pointerStartRef.current = null;
  };

  const handleTrailerAudioToggle = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    syncYouTubeAudio(trailerRef.current, nextMuted);
    trackEvent(nextMuted ? "trailer_muted" : "trailer_unmuted", {
      movie,
      metadata: { source: "feed" },
    });
  };

  return (
    <article
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="relative flex h-dvh snap-start snap-always flex-col justify-center overflow-hidden px-0 pb-0 pt-0 sm:px-4 sm:pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:pt-[calc(0.75rem+env(safe-area-inset-top))]"
    >
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

      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden bg-black shadow-2xl shadow-black/60 sm:max-h-[720px] sm:max-w-[430px] sm:rounded-md sm:border sm:border-white/10 sm:bg-[#070b0f]/72 sm:p-3 sm:backdrop-blur-sm lg:max-h-none lg:max-w-none">
        <header className="absolute inset-x-0 top-0 z-30 flex shrink-0 items-start justify-between gap-3 px-4 pt-[calc(0.85rem+env(safe-area-inset-top))] sm:relative sm:inset-auto sm:px-0 sm:pt-0">
          <div>
            <BrandLink className="text-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />
            <div className="mt-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200/80">
              <span>For You</span>
              <span>{movie.relevanceScore}%</span>
            </div>
          </div>
          <button
            onClick={() => void handleDislikeAction()}
            className={`rounded-full border px-4 py-2 text-sm font-semibold shadow-lg backdrop-blur transition ${
              optimisticState.isDisliked
                ? "border-red-200 bg-red-200 text-black"
                : "border-white/20 bg-black/35 hover:border-red-300/60 sm:bg-white/5"
            }`}
          >
            Not for me
          </button>
        </header>

        <div className="absolute inset-0 my-0 h-auto shrink-0 overflow-hidden rounded-none border-0 bg-black sm:relative sm:inset-auto sm:my-3 sm:h-[260px] sm:rounded-sm sm:border sm:border-white/10 lg:h-[300px]">
          {movie.trailerKey && isActive ? (
            <>
              <Image
                src={posterUrl(movie.poster_path)}
                alt=""
                fill
                priority={isActive}
                sizes="100vw"
                className="scale-110 object-cover opacity-60 blur-sm sm:hidden"
              />
              <div className="absolute inset-0 bg-black/35 sm:hidden" />
              <iframe
                ref={trailerRef}
                title={`${movie.title} trailer`}
                src={youtubeEmbedUrl(movie.trailerKey)}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                onLoad={() => syncYouTubeAudio(trailerRef.current, isMuted)}
                className="pointer-events-none absolute left-1/2 top-[42%] aspect-video w-[min(112vw,480px)] -translate-x-1/2 -translate-y-1/2 border-0 shadow-2xl shadow-black/70 sm:static sm:h-full sm:w-full sm:translate-x-0 sm:translate-y-0 sm:scale-125 sm:shadow-none"
              />
            </>
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
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent sm:hidden" />
          <div className="absolute inset-x-0 bottom-0 h-[48dvh] bg-gradient-to-t from-black via-black/68 to-transparent sm:h-36 sm:from-black/90 sm:via-transparent" />
          <div className="absolute left-3 top-3 hidden items-center gap-2 rounded-full bg-black/55 px-3 py-1 text-xs backdrop-blur sm:flex">
            <Play className="h-4 w-4" />
            <span>{movie.trailerKey ? "Trailer" : "Poster"}</span>
          </div>
          {movie.trailerKey && isActive && (
            <button
              type="button"
              onClick={handleTrailerAudioToggle}
              aria-label={isMuted ? "Unmute trailer" : "Mute trailer"}
              className="absolute left-4 top-[calc(5rem+env(safe-area-inset-top))] flex items-center gap-2 rounded-full bg-black/65 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition hover:bg-black/80 sm:left-auto sm:right-3 sm:top-3"
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

        {likeBurstKey > 0 && (
          <div
            key={likeBurstKey}
            className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
            aria-hidden="true"
          >
            <Heart className="animate-like-popup h-24 w-24 fill-cyan-200 text-cyan-200 drop-shadow-[0_8px_28px_rgba(0,0,0,0.7)]" />
          </div>
        )}

        <section className="absolute inset-x-0 bottom-[calc(5.4rem+env(safe-area-inset-bottom))] z-20 max-h-[42dvh] overflow-y-auto overscroll-contain px-4 pr-24 [scrollbar-width:none] [text-shadow:0_2px_8px_rgba(0,0,0,0.85)] sm:relative sm:inset-auto sm:min-h-0 sm:flex-1 sm:px-0 sm:pr-1 sm:[text-shadow:none] [&::-webkit-scrollbar]:hidden">
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

          <h1 className="text-[clamp(1.65rem,7vw,2.1rem)] font-bold leading-[1.05] sm:text-[clamp(1.55rem,6vw,1.95rem)] sm:leading-[1.08]">
            {movie.title}
          </h1>
          <p className="mt-1 line-clamp-1 text-sm text-cyan-100/75 sm:mt-2">
            {movie.genres.slice(0, 3).join(" / ")}
          </p>
          <div className="mt-2 text-sm leading-5 text-white/82 sm:mt-3">
            <p className={isOverviewExpanded ? "" : "line-clamp-2 sm:line-clamp-3"}>
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
          <p className="mt-2 line-clamp-2 rounded-sm border-l-2 border-cyan-300 bg-black/28 px-3 py-2 text-sm font-medium leading-5 text-white backdrop-blur-sm sm:mt-3 sm:bg-cyan-300/10 sm:backdrop-blur-none">
            {movie.feedReason}
          </p>
          <div className="mt-2 hidden gap-2 overflow-x-auto pb-1 sm:mt-3 sm:flex">
            {[
              ["good_pick", "Good pick"],
              ["already_watched", "Seen"],
              ["not_available", "Unavailable"],
            ].map(([feedback, label]) => (
              <button
                key={feedback}
                type="button"
                onClick={() =>
                  void handleFeedbackAction(feedback as RecommendationFeedback)
                }
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  feedback === "already_watched" && optimisticState.isSeen
                    ? "border-cyan-300 bg-cyan-300/18 text-cyan-100"
                    : "border-white/12 bg-white/[0.04] text-white/68 hover:border-cyan-300/40 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <aside className="absolute right-3 bottom-[calc(7.2rem+env(safe-area-inset-bottom))] z-30 flex shrink-0 flex-col gap-3 sm:static sm:right-auto sm:bottom-auto sm:z-auto sm:mt-4 sm:grid sm:grid-cols-5 sm:gap-2">
          <FeedAction
            active={optimisticState.isLiked}
            icon={
              <Heart
                className="h-5 w-5"
                fill={optimisticState.isLiked ? "currentColor" : "none"}
              />
            }
            label={compactNumber(movie.vote_count)}
            onClick={() => void handleLikeAction()}
          />
          <FeedAction
            active={optimisticState.isDisliked}
            icon={
              <ThumbsDown
                className="h-5 w-5"
                fill={optimisticState.isDisliked ? "currentColor" : "none"}
              />
            }
            label="not for me"
            onClick={() => void handleDislikeAction()}
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
            active={optimisticState.lists?.includes("Saved")}
            icon={
              <Bookmark
                className="h-5 w-5"
                fill={
                  optimisticState.lists?.includes("Saved")
                    ? "currentColor"
                    : "none"
                }
              />
            }
            label="save"
            onClick={() => void handleSaveAction()}
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
      className={`flex min-h-14 min-w-12 flex-col items-center justify-center gap-1 px-1 text-center text-white transition sm:rounded-sm sm:border ${
        active
          ? "text-cyan-200 sm:border-cyan-300 sm:bg-cyan-300/15"
          : "hover:text-cyan-200 sm:border-white/10 sm:bg-white/[0.04] sm:hover:border-white/30"
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full shadow-lg backdrop-blur sm:h-auto sm:w-auto sm:bg-transparent sm:shadow-none sm:backdrop-blur-none ${
          active ? "bg-cyan-300/20" : "bg-black/38"
        }`}
      >
        {icon}
      </span>
      <span className="max-w-[3.5rem] truncate text-[10px] font-semibold uppercase tracking-[0.04em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] sm:max-w-full sm:tracking-[0.08em] sm:drop-shadow-none">
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
