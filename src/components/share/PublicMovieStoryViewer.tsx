"use client";

import Image from "next/image";
import Link from "next/link";
import { Clapperboard, Sparkles, Star } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Movie } from "@/types/movie";

const imageUrl = (path: string, size = "w780") =>
  `https://image.tmdb.org/t/p/${size}${path}`;

function getYear(movie: Movie) {
  return movie.release_date ? new Date(movie.release_date).getFullYear() : null;
}

export function PublicMovieStoryViewer({ movie }: { movie: Movie }) {
  const year = getYear(movie);
  const backdrop = movie.backdrop_path || movie.poster_path;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-black text-white">
      <div className="absolute inset-0">
        {backdrop ? (
          <Image
            src={imageUrl(backdrop, movie.backdrop_path ? "w1280" : "w780")}
            alt=""
            fill
            priority
            sizes="100vw"
            className="scale-110 object-cover opacity-70 blur-sm"
          />
        ) : (
          <div className="h-full bg-[#05080b]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/72 via-black/30 to-black/90" />
      </div>

      <div className="absolute left-3 right-3 top-4 z-30 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full bg-black/42 px-3 py-2 text-sm font-bold backdrop-blur"
        >
          <BrandLogo size={18} />
          FlickBuddy
        </Link>
        <Link
          href="/"
          className="rounded-full border border-cyan-200/30 bg-cyan-300/95 px-4 py-2 text-sm font-black text-black"
        >
          Try FlickBuddy
        </Link>
      </div>

      <section className="relative z-10 mx-auto grid min-h-dvh w-full max-w-6xl items-end gap-6 px-4 pb-8 pt-24 sm:grid-cols-[minmax(240px,360px)_1fr] sm:items-center sm:px-6 sm:pb-10">
        <div className="relative mx-auto aspect-[2/3] w-[min(64vw,280px)] overflow-hidden rounded-md border border-white/12 bg-white/[0.05] shadow-2xl shadow-black/70 sm:w-full">
          {movie.poster_path ? (
            <Image
              src={imageUrl(movie.poster_path)}
              alt={movie.title}
              fill
              priority
              sizes="(min-width: 640px) 360px, 64vw"
              className="object-cover"
            />
          ) : (
            <Clapperboard className="m-auto h-full w-14 text-white/35" />
          )}
        </div>

        <div className="max-w-3xl">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
            <Sparkles className="h-4 w-4" />
            Shared FlickBuddy pick
          </p>
          <h1 className="mt-4 text-5xl font-black leading-[0.94] tracking-tight sm:text-7xl">
            {movie.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-semibold text-white/76">
            <span>{movie.mediaType === "tv" ? "Series" : "Movie"}</span>
            {year && <span>{year}</span>}
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-300 text-yellow-300" />
              {movie.vote_average.toFixed(1)}
            </span>
          </div>

          {movie.genres.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {movie.genres.slice(0, 5).map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-1 text-xs font-bold text-white/74"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/78">
            {movie.overview}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="rounded-md bg-cyan-300 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-cyan-200"
            >
              Get your own picks
            </Link>
            <Link
              href={`/movie/${movie.id}?type=${movie.mediaType === "tv" ? "tv" : "movie"}`}
              className="rounded-md border border-white/14 bg-black/22 px-5 py-3 text-center text-sm font-bold text-white/76 transition hover:border-white/30 hover:text-white"
            >
              View details
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
