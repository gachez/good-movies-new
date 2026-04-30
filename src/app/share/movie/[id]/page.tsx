import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicMovieStoryViewer } from "@/components/share/PublicMovieStoryViewer";
import { enrichMovieForFeed, getMovieDetails, getTVDetails } from "@/lib/tmdb";

interface ShareMoviePageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    type?: string;
  }>;
}

async function getSharedMovie(id: string, type?: string) {
  const movieId = Number(id);
  if (!Number.isInteger(movieId) || movieId <= 0) return null;

  const mediaType = type === "tv" ? "tv" : "movie";
  const movie =
    mediaType === "tv" ? await getTVDetails(movieId) : await getMovieDetails(movieId);

  if (!movie) return null;

  return enrichMovieForFeed(movie, 90, "Shared from FlickBuddy.");
}

export async function generateMetadata({
  params,
  searchParams,
}: ShareMoviePageProps): Promise<Metadata> {
  const { id } = await params;
  const { type } = await searchParams;
  const movie = await getSharedMovie(id, type);

  if (!movie) {
    return {
      title: "Shared pick not found",
    };
  }

  return {
    title: `${movie.title} | FlickBuddy`,
    description:
      movie.overview || `A ${movie.mediaType === "tv" ? "series" : "movie"} shared from FlickBuddy.`,
    openGraph: {
      title: `${movie.title} | FlickBuddy`,
      description:
        movie.overview || `A ${movie.mediaType === "tv" ? "series" : "movie"} shared from FlickBuddy.`,
      type: "website",
      images: movie.backdrop_path || movie.poster_path
        ? [
            {
              url: `https://image.tmdb.org/t/p/w1280${movie.backdrop_path || movie.poster_path}`,
              width: 1280,
              height: 720,
              alt: movie.title,
            },
          ]
        : undefined,
    },
  };
}

export default async function SharedMoviePage({
  params,
  searchParams,
}: ShareMoviePageProps) {
  const { id } = await params;
  const { type } = await searchParams;
  const movie = await getSharedMovie(id, type);

  if (!movie) {
    notFound();
  }

  return <PublicMovieStoryViewer movie={movie} />;
}
