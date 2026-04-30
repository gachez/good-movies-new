"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Bot,
  Film,
  Loader2,
  Search,
  Send,
  Star,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { BrandLink, BrandLogo } from "@/components/BrandLogo";
import { FlickBuddyLoader } from "@/components/FilmRabbitLoader";
import { Movie } from "@/types/movie";
import { getClientId, sendFeedback, trackEvent } from "@/utils/analytics";

const posterUrl = (path: string) => `https://image.tmdb.org/t/p/w500${path}`;

const prompts = [
  "Mind-bending with a smart lead",
  "Dark comedy about rich people",
  "Shows like Severance",
  "Comfort watch after a long day",
  "Slow burn crime mystery",
  "Beautiful animation with emotional stakes",
];

const refinePrompts = [
  "Make it darker",
  "Only series",
  "Less scary",
  "More emotional",
  "Hidden gems",
];

const modes = [
  { label: "Smart", value: "smart" },
  { label: "Mood", value: "mood" },
  { label: "Genre", value: "genre" },
  { label: "Series", value: "series" },
] as const;

type DiscoverMode = (typeof modes)[number]["value"];

interface DiscoverResponse {
  mode: "trending" | "semantic" | "ambiguous";
  error?: string;
  interpretedQuery: {
    explanation: string;
    searchTerms: string[];
    referenceTitles: string[];
  } | null;
  titleMatches: Movie[];
  discoveryMatches: Movie[];
  results: Movie[];
}

function getMovieYear(movie: Movie) {
  return movie.release_date ? new Date(movie.release_date).getFullYear() : null;
}

export default function DiscoverPage() {
  const [draft, setDraft] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [activePrompt, setActivePrompt] = useState("");
  const [mode, setMode] = useState<DiscoverMode>("smart");
  const [titleMatches, setTitleMatches] = useState<Movie[]>([]);
  const [discoveryMatches, setDiscoveryMatches] = useState<Movie[]>([]);
  const [interpretedQuery, setInterpretedQuery] =
    useState<DiscoverResponse["interpretedQuery"]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const hasQuery = submittedQuery.trim().length > 0;

  const loadMovies = useCallback(async (nextQuery: string, nextMode: DiscoverMode) => {
    setIsLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("query", nextQuery.trim());
    params.set("mode", nextMode);

    try {
      const response = await fetch(`/api/discover?${params.toString()}`, {
        headers: { "x-flickbuddy-client-id": getClientId() },
      });
      const data = (await response.json()) as DiscoverResponse;
      if (!response.ok) {
        throw new Error(
          "error" in data && typeof data.error === "string"
            ? data.error
            : "Could not load recommendations."
        );
      }
      setTitleMatches(data.titleMatches || []);
      setDiscoveryMatches(data.discoveryMatches || []);
      setInterpretedQuery(data.interpretedQuery);
      trackEvent(nextQuery.trim() ? "discover_results_loaded" : "discover_opened", {
        metadata: {
          mode: nextMode,
          query: nextQuery.trim() || null,
          resultCount: data.results?.length || 0,
        },
      });
    } catch (caughtError) {
      setTitleMatches([]);
      setDiscoveryMatches([]);
      setInterpretedQuery(null);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load recommendations."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMovies(submittedQuery, mode);
  }, [submittedQuery, mode, loadMovies]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = draft.trim();
    setActivePrompt("");
    setSubmittedQuery(nextQuery);
    if (nextQuery) {
      trackEvent("discover_searched", {
        metadata: { query: nextQuery, mode },
      });
    }
    if (nextQuery) setDraft("");
  };

  const handleRefinementSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const refinement = draft.trim();
    if (!refinement) return;
    const nextQuery = submittedQuery
      ? `${submittedQuery}. ${refinement}.`
      : refinement;
    setActivePrompt("");
    setSubmittedQuery(nextQuery);
    setDraft("");
    trackEvent("discover_refined", {
      metadata: { query: nextQuery, refinement, mode },
    });
  };

  const handlePrompt = (prompt: string) => {
    const nextMode = prompt.toLowerCase().includes("show") ? "series" : "smart";
    setActivePrompt(prompt);
    setDraft("");
    setMode(nextMode);
    setSubmittedQuery(prompt);
    trackEvent("discover_prompt_used", {
      metadata: { prompt, mode: nextMode },
    });
  };

  const handleRefine = (refinement: string) => {
    const nextQuery = submittedQuery
      ? `${submittedQuery}. ${refinement}.`
      : refinement;
    setDraft("");
    setSubmittedQuery(nextQuery);
    if (refinement === "Only series") setMode("series");
    trackEvent("discover_refine_chip_used", {
      metadata: { refinement, query: nextQuery },
    });
  };

  return (
    <main
      className={`min-h-dvh bg-[#06090c] text-white ${
        hasQuery ? "pb-64" : "pb-24"
      }`}
    >

      <section
        className={`border-b border-white/5 bg-[#06090c] px-4 ${
          hasQuery ? "sticky top-0 z-30 py-3 backdrop-blur-xl" : "pb-7 pt-8"
        }`}
      >
        <header className="flex items-center justify-between">
          <BrandLink className="text-xl" />
        </header>
        <div className="mx-auto max-w-5xl">
          <div
            className={`flex items-center justify-between ${
              hasQuery ? "" : "mb-4"
            }`}
          >
          </div>

          {!hasQuery && (
            <div className="py-8 sm:py-12">
              <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
                What should we watch?
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/58 sm:text-lg">
                Describe what you want to watch in your own words, and let FlickBuddy find the perfect movies or series for you.
              </p>
            </div>
          )}

          {!hasQuery && (
            <>
              <Composer
                draft={draft}
                mode={mode}
                isLoading={isLoading}
                onDraftChange={setDraft}
                onModeChange={setMode}
                onSubmit={handleSubmit}
              />

              <PromptChips
                activePrompt={activePrompt}
                onPrompt={handlePrompt}
              />
            </>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pt-5">
        {isLoading ? (
          <DiscoverLoadingState hasQuery={hasQuery} />
        ) : error ? (
          <ErrorState message={error} />
        ) : hasQuery ? (
          <div className="space-y-7">
            <ConversationPanel
              query={submittedQuery}
              interpretedQuery={interpretedQuery}
              titleMatches={titleMatches}
              onRefine={handleRefine}
            />

            {titleMatches.length > 0 && (
              <CompactTitleMatches movies={titleMatches} />
            )}

            {discoveryMatches.length > 0 ? (
              <RecommendationList movies={discoveryMatches} />
            ) : (
              <EmptyState />
            )}
          </div>
        ) : null}
      </section>

      {hasQuery && (
        <BottomComposer
          draft={draft}
          mode={mode}
          isLoading={isLoading}
          onDraftChange={setDraft}
          onModeChange={setMode}
          onSubmit={handleRefinementSubmit}
          onRefine={handleRefine}
        />
      )}

      <AppNav />
    </main>
  );
}

function PromptChips({
  activePrompt,
  onPrompt,
}: {
  activePrompt: string;
  onPrompt: (prompt: string) => void;
}) {
  return (
    <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          onClick={() => onPrompt(prompt)}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${
            activePrompt === prompt
              ? "border-cyan-300 bg-cyan-300 text-black"
              : "border-white/15 bg-white/[0.03] text-white"
          }`}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}

function Composer({
  draft,
  mode,
  isLoading,
  onDraftChange,
  onModeChange,
  onSubmit,
}: {
  draft: string;
  mode: DiscoverMode;
  isLoading: boolean;
  onDraftChange: (value: string) => void;
  onModeChange: (value: DiscoverMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="overflow-hidden rounded-md border border-white/12 bg-white/[0.06] shadow-2xl shadow-black/30"
    >
      <label className="flex gap-3 px-4 pt-4">
        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Describe a movie or series in plain language..."
          rows={3}
          className="min-h-24 flex-1 resize-none bg-transparent text-base font-medium leading-7 text-white outline-none placeholder:text-white/38 sm:text-lg"
        />
      </label>

      <div className="flex flex-col gap-3 border-t border-white/8 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {modes.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onModeChange(item.value)}
              className={`shrink-0 rounded-md px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                mode === item.value
                  ? "bg-white text-black"
                  : "bg-white/[0.05] text-white/58 hover:bg-white/[0.09] hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-11 items-center justify-center gap-2 rounded-md bg-cyan-300 px-5 text-sm font-black text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isLoading ? "Thinking" : "Ask"}
        </button>
      </div>
    </form>
  );
}

function BottomComposer({
  draft,
  mode,
  isLoading,
  onDraftChange,
  onModeChange,
  onSubmit,
  onRefine,
}: {
  draft: string;
  mode: DiscoverMode;
  isLoading: boolean;
  onDraftChange: (value: string) => void;
  onModeChange: (value: DiscoverMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRefine: (value: string) => void;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-24 z-50 px-3">
      <div className="mx-auto max-w-3xl rounded-md border border-cyan-300/20 bg-[#071118]/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {refinePrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onRefine(prompt)}
              disabled={isLoading}
              className="shrink-0 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-white/74 transition hover:border-cyan-300/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <label className="flex min-h-11 flex-1 items-start gap-2 rounded-md border border-white/10 bg-black/25 px-3 py-2 focus-within:border-cyan-300/60">
            <Bot className="mt-1 h-4 w-4 shrink-0 text-cyan-200" />
            <textarea
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Refine these results..."
              rows={1}
              className="max-h-28 min-h-7 flex-1 resize-none bg-transparent text-sm font-semibold leading-7 text-white outline-none placeholder:text-white/38"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading || draft.trim().length === 0}
            aria-label="Refine recommendations"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-cyan-300 text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>

        <div className="mt-2 flex gap-1 overflow-x-auto">
          {modes.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onModeChange(item.value)}
              disabled={isLoading}
              className={`shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] transition ${
                mode === item.value
                  ? "bg-cyan-300 text-black"
                  : "bg-white/[0.05] text-white/55 hover:text-white"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConversationPanel({
  query,
  interpretedQuery,
  titleMatches,
  onRefine,
}: {
  query: string;
  interpretedQuery: DiscoverResponse["interpretedQuery"];
  titleMatches: Movie[];
  onRefine: (value: string) => void;
}) {
  const tags = [
    ...(interpretedQuery?.searchTerms || []),
    ...(interpretedQuery?.referenceTitles || []),
  ].slice(0, 7);

  return (
    <div className="space-y-3">
      <div className="ml-auto max-w-[88%] rounded-md bg-cyan-300 px-4 py-3 text-sm font-bold leading-6 text-black sm:max-w-[70%]">
        {query}
      </div>

      <div className="max-w-3xl rounded-md border border-white/10 bg-white/[0.045] p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-cyan-200">
          <BrandLogo size={18} />
          FlickBuddy
        </div>
        <p className="mt-3 text-sm leading-6 text-white/75">
          {interpretedQuery?.explanation ||
            "I pulled a fresh discovery set from what is trending right now."}
        </p>

        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-white/62"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {titleMatches.length > 0 && (
          <p className="mt-4 text-xs leading-5 text-white/45">
            I found possible exact titles too, so they are separated from the
            broader recommendations.
          </p>
        )}

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {refinePrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onRefine(prompt)}
              className="shrink-0 rounded-full border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/70"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompactTitleMatches({ movies }: { movies: Movie[] }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Search className="h-4 w-4 text-white/45" />
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-white/55">
          Possible title matches
        </h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {movies.map((movie) => (
          <MoviePill key={`${movie.mediaType || "movie"}-${movie.id}`} movie={movie} />
        ))}
      </div>
    </section>
  );
}

function MoviePill({ movie }: { movie: Movie }) {
  const year = getMovieYear(movie);

  return (
    <Link
      href={`/movie/${movie.id}?type=${movie.mediaType === "tv" ? "tv" : "movie"}`}
      onClick={() =>
        trackEvent("movie_opened", {
          movie,
          metadata: { source: "discover_title_match" },
        })
      }
      className="flex w-72 shrink-0 gap-3 rounded-md border border-white/10 bg-white/[0.045] p-2"
    >
      <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-sm bg-white/[0.05]">
        <Image
          src={posterUrl(movie.poster_path)}
          alt={movie.title}
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 py-1">
        <p className="line-clamp-2 text-sm font-bold">{movie.title}</p>
        <p className="mt-2 text-xs text-white/45">
          {movie.mediaType === "tv" ? "Series" : "Movie"}
          {year ? ` / ${year}` : ""}
        </p>
        <p className="mt-2 flex items-center gap-1 text-xs text-white/65">
          <Star className="h-3 w-3 fill-yellow-300 text-yellow-300" />
          {movie.vote_average.toFixed(1)}
        </p>
      </div>
    </Link>
  );
}

function RecommendationList({ movies }: { movies: Movie[] }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
            Recommended
          </p>
          <h2 className="mt-1 text-xl font-bold">Best matches</h2>
        </div>
        <Film className="h-5 w-5 text-white/45" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {movies.map((movie, index) => (
          <RecommendationCard
            key={`${movie.mediaType || "movie"}-${movie.id}`}
            movie={movie}
            rank={index + 1}
          />
        ))}
      </div>
    </section>
  );
}

function RecommendationCard({ movie, rank }: { movie: Movie; rank: number }) {
  const [feedbackSent, setFeedbackSent] = useState("");
  const year = getMovieYear(movie);
  const reason = movie.matchReason || movie.feedReason || movie.overview;
  const movieHref = `/movie/${movie.id}?type=${movie.mediaType === "tv" ? "tv" : "movie"}`;

  const handleFeedback = (
    feedback: "good_pick" | "bad_pick" | "already_watched"
  ) => {
    setFeedbackSent(feedback);
    sendFeedback({
      movie,
      feedback,
      source: "discover",
      metadata: {
        rank,
        title: movie.title,
        relevanceScore: movie.relevanceScore,
      },
    });
    trackEvent("recommendation_feedback", {
      movie,
      metadata: { feedback, source: "discover", rank },
    });
  };

  return (
    <article className="overflow-hidden rounded-md border border-white/10 bg-white/[0.045] transition hover:border-cyan-300/40">
      <Link
        href={movieHref}
        onClick={() =>
          trackEvent("movie_opened", {
            movie,
            metadata: { source: "discover_recommendation", rank },
          })
        }
        className="group block"
      >
        <div className="relative aspect-[16/10] bg-white/[0.04]">
          <Image
            src={posterUrl(movie.backdrop_path || movie.poster_path)}
            alt={movie.title}
            fill
            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
          <div className="absolute left-3 top-3 rounded-md bg-cyan-300 px-2 py-1 text-xs font-black text-black">
            #{rank}
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <p className="line-clamp-2 text-lg font-black leading-tight">
              {movie.title}
            </p>
            <p className="mt-1 text-xs font-bold text-white/60">
              {movie.mediaType === "tv" ? "Series" : "Movie"}
              {year ? ` / ${year}` : ""} / {movie.vote_average.toFixed(1)}
            </p>
          </div>
        </div>
        <div className="p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">
            Why this fits
          </p>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/68">
            {reason}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {movie.genres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="rounded-full bg-black/24 px-2 py-1 text-[11px] font-bold text-white/55"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      </Link>
      <div className="flex gap-2 border-t border-white/8 p-3">
        {[
          ["good_pick", "Good"],
          ["bad_pick", "Off"],
          ["already_watched", "Seen"],
        ].map(([feedback, label]) => (
          <button
            key={feedback}
            type="button"
            onClick={() =>
              handleFeedback(feedback as "good_pick" | "bad_pick" | "already_watched")
            }
            className={`flex-1 rounded-sm border px-2 py-2 text-xs font-black uppercase tracking-[0.08em] transition ${
              feedbackSent === feedback
                ? "border-cyan-300 bg-cyan-300 text-black"
                : "border-white/10 bg-black/20 text-white/60 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </article>
  );
}

function DiscoverLoadingState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-md border border-cyan-300/15 bg-[#071118] p-5 shadow-2xl shadow-black/25">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:text-left">
          <FlickBuddyLoader
            size="sm"
            title={hasQuery ? "FlickBuddy is finding matches..." : "FlickBuddy is warming up..."}
            message={
              hasQuery
                ? "The mascot is checking tone, story, and taste signals before ranking the best picks."
                : "Loading a fresh discovery pool so there is something good to start from."
            }
            className="sm:items-start sm:text-left"
            animationClassName="shrink-0"
          />
          <div className="hidden h-24 flex-1 flex-col justify-center gap-3 sm:flex">
            <div className="h-3 w-4/5 animate-pulse rounded-full bg-cyan-300/20" />
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/10" />
            <div className="h-3 w-3/5 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-md border border-white/8 bg-white/[0.045]"
          >
            <div className="aspect-[16/10] animate-pulse bg-cyan-300/10" />
            <div className="space-y-3 p-4">
              <div className="h-3 w-24 animate-pulse rounded-full bg-cyan-300/20" />
              <div className="h-4 w-4/5 animate-pulse rounded-full bg-white/12" />
              <div className="h-3 w-full animate-pulse rounded-full bg-white/8" />
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-20 text-center">
      <p className="text-lg font-bold">No matches found</p>
      <p className="mt-2 text-sm text-white/55">
        Try a richer prompt like “mind-bending thriller with a smart lead.”
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-300/20 bg-red-950/20 px-6 py-10 text-center">
      <p className="text-base font-bold text-red-100">{message}</p>
      <p className="mt-2 text-sm text-white/55">
        Try again in a bit or use the regular search tab.
      </p>
    </div>
  );
}
