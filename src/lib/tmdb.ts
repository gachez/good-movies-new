const TMDB_BASE = "https://api.themoviedb.org/3";

// Static genre map so we can resolve genre_ids → names without an extra API call
const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

const GENRE_ALIASES: Record<string, number[]> = {
  action: [28, 10759],
  adventure: [12, 10759],
  fantasy: [14, 10765],
  "science fiction": [878, 10765],
  "sci fi": [878, 10765],
  scifi: [878, 10765],
  war: [10752, 10768],
  family: [10751, 10762],
};

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  original_language: string;
  overview: string;
  release_date: string;
  poster_path: string;
  backdrop_path: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  adult: boolean;
  video: boolean;
  genre_ids: number[];
  genres: string[];
  mediaType?: "movie" | "tv";
}

interface TMDBTVResult {
  id: number;
  name: string;
  original_name: string;
  original_language: string;
  overview: string;
  first_air_date: string;
  poster_path: string;
  backdrop_path: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  adult: boolean;
  genre_ids: number[];
  origin_country?: string[];
}

type TMDBMultiResult =
  | (Omit<TMDBMovie, "genres"> & { media_type: "movie" })
  | (TMDBTVResult & { media_type: "tv" });

export interface TMDBMovieVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  size: number;
  published_at: string;
}

export interface TMDBMovieReview {
  id: string;
  author: string;
  content: string;
  created_at: string;
  url: string;
  author_details?: {
    avatar_path?: string | null;
    rating?: number | null;
  };
}

export interface TMDBMovieFeedItem extends TMDBMovie {
  relevanceScore: number;
  trailerKey?: string;
  trailerName?: string;
  reviews: {
    id: string;
    author: string;
    avatarPath?: string | null;
    rating?: number | null;
    content: string;
    createdAt: string;
    url?: string;
  }[];
  feedReason: string;
}

function resolveGenres(genre_ids: number[]): string[] {
  return genre_ids.map((id) => GENRE_MAP[id]).filter(Boolean);
}

function normalizeMovie(movie: Omit<TMDBMovie, "genres">): TMDBMovie {
  return {
    ...movie,
    genres: resolveGenres(movie.genre_ids || []),
    mediaType: movie.mediaType || "movie",
  };
}

function normalizeTV(show: TMDBTVResult): TMDBMovie {
  return {
    id: show.id,
    title: show.name,
    original_title: show.original_name,
    original_language: show.original_language,
    overview: show.overview,
    release_date: show.first_air_date,
    poster_path: show.poster_path,
    backdrop_path: show.backdrop_path,
    popularity: show.popularity,
    vote_average: show.vote_average,
    vote_count: show.vote_count,
    adult: show.adult,
    video: false,
    genre_ids: show.genre_ids || [],
    genres: resolveGenres(show.genre_ids || []),
    mediaType: "tv",
  };
}

async function fetchTMDB<T>(
  path: string,
  params: Record<string, string | number | boolean> = {}
): Promise<T | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.error("TMDB_API_KEY is not configured");
    return null;
  }

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "en-US");

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    console.error(`TMDB request failed for "${path}": ${res.status}`);
    return null;
  }

  return (await res.json()) as T;
}

interface TMDBListResponse<T> {
  results: T[];
}

export async function searchMovies(query: string): Promise<TMDBMovie[]> {
  const data = await fetchTMDB<TMDBListResponse<Omit<TMDBMovie, "genres">>>(
    "/search/movie",
    {
      query,
      include_adult: false,
      page: 1,
    }
  );

  return (data?.results || []).map(normalizeMovie);
}

export async function searchTV(query: string): Promise<TMDBMovie[]> {
  const data = await fetchTMDB<TMDBListResponse<TMDBTVResult>>("/search/tv", {
    query,
    include_adult: false,
    page: 1,
  });

  return (data?.results || []).map(normalizeTV);
}

export async function searchMulti(query: string): Promise<TMDBMovie[]> {
  const data = await fetchTMDB<TMDBListResponse<TMDBMultiResult>>(
    "/search/multi",
    {
      query,
      include_adult: false,
      page: 1,
    }
  );

  return (data?.results || [])
    .filter((item) => item.media_type === "movie" || item.media_type === "tv")
    .map((item) =>
      item.media_type === "tv"
        ? normalizeTV(item)
        : normalizeMovie({ ...item, mediaType: "movie" })
    );
}

export async function searchMultiple(terms: string[]): Promise<TMDBMovie[]> {
  const results = await Promise.all(terms.map(searchMulti));
  const seen = new Set<string>();
  const merged: TMDBMovie[] = [];

  for (const batch of results) {
    for (const movie of batch) {
      const key = `${movie.mediaType || "movie"}:${movie.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(movie);
      }
    }
  }

  return merged;
}

export async function getTrendingMovies(page: number = 1): Promise<TMDBMovie[]> {
  const data = await fetchTMDB<TMDBListResponse<Omit<TMDBMovie, "genres">>>(
    "/trending/movie/week",
    { page }
  );

  return (data?.results || []).map(normalizeMovie);
}

export async function getTrendingTV(page: number = 1): Promise<TMDBMovie[]> {
  const data = await fetchTMDB<TMDBListResponse<TMDBTVResult>>(
    "/trending/tv/week",
    { page }
  );

  return (data?.results || []).map(normalizeTV);
}

export async function getPopularMovies(page: number = 1): Promise<TMDBMovie[]> {
  const data = await fetchTMDB<TMDBListResponse<Omit<TMDBMovie, "genres">>>(
    "/movie/popular",
    { page }
  );

  return (data?.results || []).map(normalizeMovie);
}

export async function getPopularTV(page: number = 1): Promise<TMDBMovie[]> {
  const data = await fetchTMDB<TMDBListResponse<TMDBTVResult>>("/tv/popular", {
    page,
  });

  return (data?.results || []).map(normalizeTV);
}

export async function discoverMoviesByGenres(
  genreIds: number[],
  page: number = 1
): Promise<TMDBMovie[]> {
  if (genreIds.length === 0) return [];

  const data = await fetchTMDB<TMDBListResponse<Omit<TMDBMovie, "genres">>>(
    "/discover/movie",
    {
      include_adult: false,
      sort_by: "popularity.desc",
      with_genres: genreIds.slice(0, 4).join("|"),
      page,
    }
  );

  return (data?.results || []).map(normalizeMovie);
}

export async function discoverTVByGenres(
  genreIds: number[],
  page: number = 1
): Promise<TMDBMovie[]> {
  if (genreIds.length === 0) return [];

  const data = await fetchTMDB<TMDBListResponse<TMDBTVResult>>("/discover/tv", {
    include_adult: false,
    sort_by: "popularity.desc",
    with_genres: genreIds.slice(0, 4).join("|"),
    page,
  });

  return (data?.results || []).map(normalizeTV);
}

export async function getMovieRecommendations(
  movieId: number,
  page: number = 1
): Promise<TMDBMovie[]> {
  const data = await fetchTMDB<TMDBListResponse<Omit<TMDBMovie, "genres">>>(
    `/movie/${movieId}/recommendations`,
    { page }
  );

  return (data?.results || []).map(normalizeMovie);
}

export async function getTVRecommendations(
  seriesId: number,
  page: number = 1
): Promise<TMDBMovie[]> {
  const data = await fetchTMDB<TMDBListResponse<TMDBTVResult>>(
    `/tv/${seriesId}/recommendations`,
    { page }
  );

  return (data?.results || []).map(normalizeTV);
}

export async function discoverMovies(page: number = 1): Promise<TMDBMovie[]> {
  const data = await fetchTMDB<TMDBListResponse<Omit<TMDBMovie, "genres">>>(
    "/discover/movie",
    {
      include_adult: false,
      sort_by: "popularity.desc",
      "vote_count.gte": 80,
      page,
    }
  );

  return (data?.results || []).map(normalizeMovie);
}

export async function discoverTV(page: number = 1): Promise<TMDBMovie[]> {
  const data = await fetchTMDB<TMDBListResponse<TMDBTVResult>>("/discover/tv", {
    include_adult: false,
    sort_by: "popularity.desc",
    "vote_count.gte": 80,
    page,
  });

  return (data?.results || []).map(normalizeTV);
}

export async function getMovieDetails(movieId: number): Promise<TMDBMovie | null> {
  const data = await fetchTMDB<Omit<TMDBMovie, "genre_ids" | "genres"> & {
    genres?: { id: number; name: string }[];
  }>(`/movie/${movieId}`);

  if (!data) return null;

  const genreIds = data.genres?.map((genre) => genre.id) || [];
  return {
    ...data,
    genre_ids: genreIds,
    genres: data.genres?.map((genre) => genre.name) || resolveGenres(genreIds),
  };
}

export async function getTVDetails(seriesId: number): Promise<TMDBMovie | null> {
  const data = await fetchTMDB<TMDBTVResult & {
    genres?: { id: number; name: string }[];
  }>(`/tv/${seriesId}`);

  if (!data) return null;

  const genreIds = data.genres?.map((genre) => genre.id) || data.genre_ids || [];
  return {
    ...normalizeTV({
      ...data,
      genre_ids: genreIds,
    }),
    genres: data.genres?.map((genre) => genre.name) || resolveGenres(genreIds),
  };
}

export async function getMovieVideos(movieId: number): Promise<TMDBMovieVideo[]> {
  const data = await fetchTMDB<TMDBListResponse<TMDBMovieVideo>>(
    `/movie/${movieId}/videos`
  );

  return data?.results || [];
}

export async function getTVVideos(seriesId: number): Promise<TMDBMovieVideo[]> {
  const data = await fetchTMDB<TMDBListResponse<TMDBMovieVideo>>(
    `/tv/${seriesId}/videos`
  );

  return data?.results || [];
}

export async function getMovieReviews(
  movieId: number
): Promise<TMDBMovieReview[]> {
  const data = await fetchTMDB<TMDBListResponse<TMDBMovieReview>>(
    `/movie/${movieId}/reviews`,
    { page: 1 }
  );

  return data?.results || [];
}

export async function getTVReviews(seriesId: number): Promise<TMDBMovieReview[]> {
  const data = await fetchTMDB<TMDBListResponse<TMDBMovieReview>>(
    `/tv/${seriesId}/reviews`,
    { page: 1 }
  );

  return data?.results || [];
}

export function getGenreIdsByNames(names: string[]): number[] {
  const normalizedNames = new Set(names.map((name) => name.toLowerCase()));
  const ids = new Set<number>();

  for (const name of normalizedNames) {
    for (const id of GENRE_ALIASES[name] || []) {
      ids.add(id);
    }
  }

  Object.entries(GENRE_MAP)
    .filter(([, name]) => normalizedNames.has(name.toLowerCase()))
    .forEach(([id]) => ids.add(Number(id)));

  return Array.from(ids);
}

export function getKnownGenreNames(): string[] {
  return Array.from(new Set(Object.values(GENRE_MAP))).sort();
}

export function pickBestTrailer(videos: TMDBMovieVideo[]) {
  return videos
    .filter((video) => video.site === "YouTube")
    .filter((video) => video.type === "Trailer" || video.type === "Teaser")
    .sort((a, b) => {
      if (a.official !== b.official) return a.official ? -1 : 1;
      if (a.type !== b.type) return a.type === "Trailer" ? -1 : 1;
      return b.size - a.size;
    })[0];
}

export async function enrichMovieForFeed(
  movie: TMDBMovie,
  relevanceScore: number,
  feedReason: string
): Promise<TMDBMovieFeedItem> {
  const isSeries = movie.mediaType === "tv";
  const [videos, reviews] = await Promise.all([
    isSeries ? getTVVideos(movie.id) : getMovieVideos(movie.id),
    isSeries ? getTVReviews(movie.id) : getMovieReviews(movie.id),
  ]);
  const trailer = pickBestTrailer(videos);

  return {
    ...movie,
    relevanceScore,
    trailerKey: trailer?.key,
    trailerName: trailer?.name,
    reviews: reviews.slice(0, 6).map((review) => ({
      id: review.id,
      author: review.author,
      avatarPath: review.author_details?.avatar_path,
      rating: review.author_details?.rating,
      content: review.content,
      createdAt: review.created_at,
      url: review.url,
    })),
    feedReason,
  };
}
