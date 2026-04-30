import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureBackendReady } from "@/lib/auth-migrations";
import {
  discoverMoviesByGenres,
  discoverMovies,
  discoverTV,
  discoverTVByGenres,
  enrichMovieForFeed,
  getGenreIdsByNames,
  getMovieRecommendations,
  getPopularMovies,
  getPopularTV,
  getTrendingMovies,
  getTrendingTV,
  getTVRecommendations,
  searchMultiple,
  TMDBMovie,
} from "@/lib/tmdb";
import { getStoredTasteProfile, AITasteProfile } from "@/lib/taste-profile";
import { getUserTastePayload, MediaSeed } from "@/lib/user-movies";

export const runtime = "nodejs";

interface FeedRequestBody {
  likedMovieIds?: number[];
  dislikedMovieIds?: number[];
  savedMovieIds?: number[];
  watchedMovieIds?: number[];
  likedSeeds?: MediaSeed[];
  savedSeeds?: MediaSeed[];
  excludeKeys?: string[];
  likedGenres?: string[];
  dislikedGenres?: string[];
  excludeMovieIds?: number[];
  cursor?: number;
  aiProfile?: AITasteProfile | null;
}

interface Candidate {
  movie: TMDBMovie;
  score: number;
  reasons: Set<string>;
}

const MAX_PERSONAL_SEEDS = 8;
const FEED_SIZE = 24;
const MAX_DISCOVERY_PAGE = 20;

function normalizeCursor(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function cursorPage(cursor: number, offset = 0) {
  return ((cursor + offset) % MAX_DISCOVERY_PAGE) + 1;
}

function stringArray(value: unknown, maxLength: number) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, maxLength)
    : [];
}

function numberArray(value: unknown, maxLength: number) {
  return Array.isArray(value)
    ? value.map(Number).filter((item) => Number.isInteger(item) && item > 0).slice(0, maxLength)
    : [];
}

function seedArray(value: unknown, maxLength: number): MediaSeed[] {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      const id = Number(record.id);
      if (!Number.isInteger(id) || id <= 0) return [];
      return [
        {
          id,
          mediaType: record.mediaType === "tv" ? "tv" : "movie",
        } satisfies MediaSeed,
      ];
    })
    .slice(0, maxLength);
}

function compactFeedBody(body: FeedRequestBody): FeedRequestBody {
  return {
    likedMovieIds: numberArray(body.likedMovieIds, 80),
    dislikedMovieIds: numberArray(body.dislikedMovieIds, 80),
    savedMovieIds: numberArray(body.savedMovieIds, 80),
    watchedMovieIds: numberArray(body.watchedMovieIds, 120),
    likedSeeds: seedArray(body.likedSeeds, 20),
    savedSeeds: seedArray(body.savedSeeds, 20),
    excludeKeys: stringArray(body.excludeKeys, 600),
    likedGenres: stringArray(body.likedGenres, 20),
    dislikedGenres: stringArray(body.dislikedGenres, 20),
    excludeMovieIds: numberArray(body.excludeMovieIds, 400),
    cursor: normalizeCursor(body.cursor),
    aiProfile: null,
  };
}

function addCandidate(
  candidates: Map<string, Candidate>,
  movie: TMDBMovie,
  score: number,
  reason: string
) {
  if (!movie.poster_path || movie.adult) return;

  const key = `${movie.mediaType || "movie"}:${movie.id}`;
  const existing = candidates.get(key);
  if (existing) {
    existing.score += score;
    existing.reasons.add(reason);
    return;
  }

  candidates.set(key, {
    movie,
    score,
    reasons: new Set([reason]),
  });
}

function scoreByTaste(candidate: Candidate, body: FeedRequestBody) {
  const likedGenres = new Set(body.likedGenres || []);
  const dislikedGenres = new Set(body.dislikedGenres || []);
  const likedThemes = (body.aiProfile?.likedThemes || []).map((theme) =>
    theme.toLowerCase()
  );
  const dislikedThemes = (body.aiProfile?.dislikedThemes || []).map((theme) =>
    theme.toLowerCase()
  );
  const searchableText = [
    candidate.movie.title,
    candidate.movie.overview,
    candidate.movie.genres.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  candidate.movie.genres.forEach((genre) => {
    if (likedGenres.has(genre)) candidate.score += 8;
    if (dislikedGenres.has(genre)) candidate.score -= 14;
    const aiGenreWeight = body.aiProfile?.genreWeights[genre];
    if (typeof aiGenreWeight === "number") {
      candidate.score += aiGenreWeight * 2;
    }
  });

  likedThemes.forEach((theme) => {
    if (searchableText.includes(theme)) candidate.score += 7;
  });
  dislikedThemes.forEach((theme) => {
    if (searchableText.includes(theme)) candidate.score -= 12;
  });

  candidate.score += Math.min(candidate.movie.vote_average, 10);
  candidate.score += Math.min(candidate.movie.popularity / 50, 8);
}

function makeFeedReason(candidate: Candidate) {
  const reasons = Array.from(candidate.reasons);
  if (reasons.includes("because of movies you liked")) {
    return "Because it lines up with movies you have liked.";
  }
  if (reasons.includes("because of your saved movies")) {
    return "Because it resembles movies you saved for later.";
  }
  if (reasons.includes("because of your favorite genres")) {
    return "Because it matches genres you keep responding to.";
  }
  if (reasons.includes("AI taste profile")) {
    return "Because FlickBuddy's AI taste profile found a deeper match.";
  }
  if (reasons.includes("trending this week")) {
    return "Trending right now and likely worth a look.";
  }
  if (reasons.includes("fresh discovery")) {
    return "A fresh discovery lane pick to keep your feed varied.";
  }
  return "A popular pick that fits the discovery feed.";
}

async function buildFeed(body: FeedRequestBody) {
  const cursor = normalizeCursor(body.cursor);
  const likedSeeds = (
    body.likedSeeds?.length
      ? body.likedSeeds
      : (body.likedMovieIds || []).map((id) => ({ id, mediaType: "movie" as const }))
  ).slice(0, MAX_PERSONAL_SEEDS);
  const savedSeeds = (
    body.savedSeeds?.length
      ? body.savedSeeds
      : (body.savedMovieIds || []).map((id) => ({ id, mediaType: "movie" as const }))
  ).slice(0, MAX_PERSONAL_SEEDS);
  const likedGenreIds = getGenreIdsByNames(body.likedGenres || []);
  const primaryPage = cursorPage(cursor);
  const secondaryPage = cursorPage(cursor, 3);
  const explorationPage = cursorPage(cursor, 9);
  const recommendationPage = cursorPage(cursor, 1);
  const aiSearchTerms = [
    ...(body.aiProfile?.recommendedQueries || []),
    ...(body.aiProfile?.referenceTitles || []),
  ].slice(cursor % 3, cursor % 3 + 6);

  const [
    trendingMovies,
    trendingTV,
    popularMovies,
    popularTV,
    discoveryMovies,
    discoveryTV,
    genreMovieMatches,
    genreTVMatches,
    aiSearchMatches,
    likedRecommendationBatches,
    savedRecommendationBatches,
  ] = await Promise.all([
    getTrendingMovies(primaryPage),
    getTrendingTV(primaryPage),
    getPopularMovies(secondaryPage),
    getPopularTV(secondaryPage),
    discoverMovies(explorationPage),
    discoverTV(explorationPage),
    discoverMoviesByGenres(likedGenreIds, secondaryPage),
    discoverTVByGenres(likedGenreIds, secondaryPage),
    aiSearchTerms.length > 0 ? searchMultiple(aiSearchTerms) : Promise.resolve([]),
    Promise.all(likedSeeds.map((seed) => getSeedRecommendations(seed, recommendationPage))),
    Promise.all(savedSeeds.map((seed) => getSeedRecommendations(seed, recommendationPage))),
  ]);

  const candidates = new Map<string, Candidate>();

  trendingMovies.forEach((movie) =>
    addCandidate(candidates, movie, 16, "trending this week")
  );
  trendingTV.forEach((movie) =>
    addCandidate(candidates, movie, 16, "trending this week")
  );
  popularMovies.forEach((movie) => addCandidate(candidates, movie, 8, "popular on TMDB"));
  popularTV.forEach((movie) => addCandidate(candidates, movie, 8, "popular on TMDB"));
  discoveryMovies.forEach((movie) =>
    addCandidate(candidates, movie, 12, "fresh discovery")
  );
  discoveryTV.forEach((movie) => addCandidate(candidates, movie, 12, "fresh discovery"));
  [...genreMovieMatches, ...genreTVMatches].forEach((movie) =>
    addCandidate(candidates, movie, 22, "because of your favorite genres")
  );
  aiSearchMatches.forEach((movie) =>
    addCandidate(candidates, movie, 30, "AI taste profile")
  );

  likedRecommendationBatches.flat().forEach((movie) =>
    addCandidate(candidates, movie, 34, "because of movies you liked")
  );

  savedRecommendationBatches.flat().forEach((movie) =>
    addCandidate(candidates, movie, 28, "because of your saved movies")
  );

  const excluded = new Set([
    ...(body.excludeMovieIds || []),
    ...(body.dislikedMovieIds || []),
    ...(body.watchedMovieIds || []),
  ]);
  const excludedKeys = new Set(body.excludeKeys || []);

  const rankedCandidates = Array.from(candidates.values())
    .filter((candidate) => {
      const key = `${candidate.movie.mediaType || "movie"}:${candidate.movie.id}`;
      return !excluded.has(candidate.movie.id) && !excludedKeys.has(key);
    })
    .map((candidate) => {
      scoreByTaste(candidate, body);
      candidate.score += Math.random() * 6;
      return candidate;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, FEED_SIZE);

  return Promise.all(
    rankedCandidates.map((candidate) =>
      enrichMovieForFeed(
        candidate.movie,
        Math.min(Math.max(Math.round(candidate.score), 1), 100),
        makeFeedReason(candidate)
      )
    )
  );
}

async function getSeedRecommendations(seed: MediaSeed, page: number) {
  return seed.mediaType === "tv"
    ? getTVRecommendations(seed.id, page)
    : getMovieRecommendations(seed.id, page);
}

export async function GET() {
  await ensureBackendReady();
  const results = await buildFeed({});
  return NextResponse.json({ results, nextCursor: 1 });
}

export async function POST(request: NextRequest) {
  await ensureBackendReady();
  let body: FeedRequestBody = {};

  try {
    body = (await request.json()) as FeedRequestBody;
  } catch {
    body = {};
  }
  body = compactFeedBody(body);

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (session) {
    const serverTaste = getUserTastePayload(session.user.id);
    body = {
      likedMovieIds: serverTaste.likedMovieIds,
      dislikedMovieIds: serverTaste.dislikedMovieIds,
      savedMovieIds: serverTaste.savedMovieIds,
      watchedMovieIds: serverTaste.watchedMovieIds,
      likedSeeds: serverTaste.likedSeeds,
      savedSeeds: serverTaste.savedSeeds,
      likedGenres: serverTaste.likedGenres,
      dislikedGenres: serverTaste.dislikedGenres,
      excludeKeys: Array.from(
        new Set([...(body.excludeKeys || []), ...serverTaste.excludeKeys])
      ),
      excludeMovieIds: Array.from(
        new Set([...(body.excludeMovieIds || []), ...serverTaste.excludeMovieIds])
      ),
      cursor: normalizeCursor(body.cursor),
      aiProfile: getStoredTasteProfile(session.user.id),
    };
  }

  const results = await buildFeed(body);
  return NextResponse.json({
    results,
    nextCursor: normalizeCursor(body.cursor) + 1,
  });
}
