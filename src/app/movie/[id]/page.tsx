"use client";

import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Bookmark, Heart, MessageCircle, Send, Star } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { AuthNudge } from "@/components/auth/AuthNudge";
import { BackButton } from "@/components/BackButton";
import { FlickBuddyLoader } from "@/components/FilmRabbitLoader";
import { ListSelectionModal } from "@/components/ListSelectionModal";
import { authClient } from "@/lib/auth-client";
import { Movie } from "@/types/movie";
import posthog from "posthog-js";
import { MovieStorage } from "@/utils/movieStorage";
import { shareOrCopy } from "@/utils/share";

const posterUrl = (path: string) => `https://image.tmdb.org/t/p/w780${path}`;
const youtubeEmbedUrl = (key: string) =>
  `https://www.youtube.com/embed/${key}?autoplay=0&mute=0&playsinline=1&controls=1&rel=0&modestbranding=1`;

export default function MovieSharePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const mediaType = searchParams.get("type") === "tv" ? "tv" : "movie";
  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const session = authClient.useSession();

  useEffect(() => {
    async function loadMovie() {
      try {
        const response = await fetch(`/api/movie/${params.id}?type=${mediaType}`);
        if (!response.ok) throw new Error("Movie not found");
        const data = (await response.json()) as { result: Movie };
        setMovie(data.result);
        posthog.capture("movie_detail_viewed", {
          movie_id: data.result.id,
          media_type: mediaType,
          title: data.result.title,
        });
      } catch (error) {
        console.error(error);
        posthog.captureException(error);
        toast.error("Could not load this movie.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadMovie();
  }, [params.id, mediaType]);

  const handleShare = async () => {
    if (!movie) return;
    if (!session.data?.user) {
      setAuthOpen(true);
      return;
    }
    const url = `${window.location.origin}/share/movie/${movie.id}?type=${movie.mediaType === "tv" ? "tv" : "movie"}`;
    try {
      const result = await shareOrCopy({
        title: movie.title,
        text: `I found ${movie.title} on FlickBuddy.`,
        url,
      });
      if (result === "copied") toast.success("Share link copied.");
      await saveInteraction(movie, "share");
    } catch (error) {
      console.error(error);
      toast.error("Could not share this movie.");
    }
  };

  const saveInteraction = async (selectedMovie: Movie, action: string) => {
    await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movie: selectedMovie, action }),
    });
  };

  const handleLike = async () => {
    if (!movie) return;
    if (!session.data?.user) {
      setAuthOpen(true);
      return;
    }
    MovieStorage.saveMovieState(movie.id, { isLiked: true, isDisliked: false });
    MovieStorage.addToList(movie, "Liked");
    await saveInteraction(movie, "like");
    toast.success("Added to your taste profile.");
  };

  const handleSave = async () => {
    if (!movie) return;
    if (!session.data?.user) {
      setAuthOpen(true);
      return;
    }
    setListPickerOpen(true);
  };

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#05080b] px-6 text-white">
        <FlickBuddyLoader
          title="Loading this pick..."
          message="FlickBuddy is pulling the trailer, details, and taste context into view."
        />
      </main>
    );
  }

  if (!movie) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-black text-white">
        Movie not found.
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#05080b] text-white">
      <Toaster position="top-center" />
      <AuthNudge
        open={authOpen}
        onOpenChange={setAuthOpen}
        onAuthed={() => {
          void session.refetch();
        }}
      />
      <ListSelectionModal
        movie={movie}
        open={listPickerOpen}
        onOpenChange={setListPickerOpen}
        onSaved={(list) => {
          MovieStorage.addToList(movie, list.name);
          void saveInteraction(movie, "save");
        }}
      />
      <section className="mx-auto grid min-h-dvh max-w-6xl grid-cols-1 lg:grid-cols-[minmax(360px,520px)_1fr]">
        <div className="relative min-h-[68dvh] overflow-hidden bg-black lg:min-h-dvh">
          {movie.trailerKey ? (
            <iframe
              title={`${movie.title} trailer`}
              src={youtubeEmbedUrl(movie.trailerKey)}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="h-full min-h-[68dvh] w-full border-0 lg:min-h-dvh"
            />
          ) : (
            <Image
              src={posterUrl(movie.poster_path)}
              alt={movie.title}
              fill
              priority
              sizes="(min-width: 1024px) 520px, 100vw"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/80" />
          <BackButton
            fallbackHref="/"
            className="absolute left-4 top-4 rounded-full bg-black/60 p-3 backdrop-blur"
          />
        </div>

        <div className="px-5 py-7 lg:px-10 lg:py-14">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">
            Shared Recommendation
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight lg:text-6xl">
            {movie.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/75">
            <span>{new Date(movie.release_date).getFullYear()}</span>
            <span>
              {movie.mediaType === "tv" ? "Series" : "Movie"} ·{" "}
              {movie.genres.slice(0, 3).join(", ")}
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-300 text-yellow-300" />
              {movie.vote_average.toFixed(1)}
            </span>
          </div>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/80">
            {movie.overview}
          </p>
          <p className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-white/80">
            {movie.feedReason}
          </p>

          <div className="mt-7 grid grid-cols-3 gap-3">
            <button
              onClick={handleLike}
              className="flex items-center justify-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-semibold text-black"
            >
              <Heart className="h-5 w-5" />
              Like
            </button>
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-2 rounded-md border border-white/20 px-4 py-3 text-sm font-semibold"
            >
              <Bookmark className="h-5 w-5" />
              Save
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 rounded-md border border-white/20 px-4 py-3 text-sm font-semibold"
            >
              <Send className="h-5 w-5" />
              Share
            </button>
          </div>

          <section className="mt-10">
            <div className="mb-4 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Reviews</h2>
            </div>
            <div className="space-y-5">
              {(movie.reviews || []).slice(0, 4).map((review) => (
                <article key={review.id} className="border-b border-white/10 pb-4">
                  <div className="mb-2 flex justify-between gap-3">
                    <p className="font-semibold">{review.author}</p>
                    {review.rating && (
                      <span className="text-xs text-cyan-300">
                        {review.rating}/10
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-5 text-sm leading-6 text-white/70">
                    {review.content}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
