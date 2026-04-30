"use client";

import Image from "next/image";
import Link from "next/link";
import type { MouseEvent, TouchEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Clapperboard, Star } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Movie } from "@/types/movie";

interface ListMovieItem {
  id: string;
  movie: Movie;
  position: number;
  addedAt: string;
}

interface PublicMovieList {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  shareSlug: string | null;
  createdAt: string;
  updatedAt: string;
  movies: ListMovieItem[];
  creator: {
    name: string;
    avatarUrl: string | null;
  };
}

type StorySlide =
  | {
      type: "intro";
      id: string;
    }
  | {
      type: "movie";
      id: string;
      item: ListMovieItem;
    };

const imageUrl = (path: string, size = "w780") =>
  `https://image.tmdb.org/t/p/${size}${path}`;

function getYear(movie: Movie) {
  return movie.release_date ? new Date(movie.release_date).getFullYear() : null;
}

export function PublicListStoryViewer({ list }: { list: PublicMovieList }) {
  const slides = useMemo<StorySlide[]>(
    () => [
      { type: "intro", id: "intro" },
      ...list.movies.map((item) => ({
        type: "movie" as const,
        id: item.id,
        item,
      })),
    ],
    [list.movies]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const activeSlide = slides[activeIndex];

  useEffect(() => {
    setProgress(0);
  }, [activeIndex]);

  useEffect(() => {
    if (activeIndex === slides.length - 1) return;

    const interval = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 100) {
          setActiveIndex((index) => Math.min(index + 1, slides.length - 1));
          return 0;
        }

        return current + 1.2;
      });
    }, 90);

    return () => window.clearInterval(interval);
  }, [activeIndex, slides.length]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrevious();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const goNext = () => {
    setActiveIndex((index) => Math.min(index + 1, slides.length - 1));
  };

  const goPrevious = () => {
    setActiveIndex((index) => Math.max(index - 1, 0));
  };

  const handleTap = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    if (x < bounds.width * 0.38) {
      goPrevious();
    } else {
      goNext();
    }
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStart === null) return;
    const delta = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(delta) > 40) {
      if (delta < 0) goNext();
      if (delta > 0) goPrevious();
    }
    setTouchStart(null);
  };

  return (
    <main className="relative h-dvh overflow-hidden bg-black text-white">
      <StoryBackdrop slide={activeSlide} />

      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/86" />

      <div className="absolute inset-x-0 top-0 z-30 px-3 pt-3">
        <div className="flex gap-1">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="h-1 flex-1 overflow-hidden rounded-full bg-white/22"
            >
              <div
                className="h-full rounded-full bg-white transition-[width] duration-100"
                style={{
                  width:
                    index < activeIndex
                      ? "100%"
                      : index === activeIndex
                        ? `${progress}%`
                        : "0%",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute left-3 right-3 top-8 z-30 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full bg-black/38 px-3 py-2 text-sm font-bold backdrop-blur"
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

      <div
        onClick={handleTap}
        onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
        onTouchEnd={handleTouchEnd}
        className="relative z-20 flex h-full cursor-pointer items-end px-4 pb-8 pt-24 sm:items-center sm:justify-center sm:pb-0"
      >
        {activeSlide.type === "intro" ? (
          <IntroSlide list={list} />
        ) : (
          <MovieSlide item={activeSlide.item} />
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-4 z-30 hidden justify-between sm:flex">
        <button
          onClick={goPrevious}
          disabled={activeIndex === 0}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-black/40 backdrop-blur disabled:opacity-25"
          aria-label="Previous slide"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          onClick={goNext}
          disabled={activeIndex === slides.length - 1}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-black/40 backdrop-blur disabled:opacity-25"
          aria-label="Next slide"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </main>
  );
}

function StoryBackdrop({ slide }: { slide: StorySlide }) {
  if (slide.type === "intro") {
    return (
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#194451_0,#05080b_48%,#010203_100%)]" />
    );
  }

  const movie = slide.item.movie;
  const backdrop = movie.backdrop_path || movie.poster_path;

  return (
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
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
}

function IntroSlide({ list }: { list: PublicMovieList }) {
  const coverMovies = list.movies.slice(0, 5);

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-7 sm:grid sm:grid-cols-[1fr_360px] sm:items-center">
      <div className="max-w-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-cyan-200/40 bg-cyan-300/15">
            {list.creator.avatarUrl ? (
              <div
                aria-label={list.creator.name}
                className="h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${list.creator.avatarUrl})` }}
              />
            ) : (
              <BrandLogo size={30} />
            )}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
              List created on FlickBuddy
            </p>
            <p className="mt-1 text-sm font-semibold text-white/72">
              by {list.creator.name}
            </p>
          </div>
        </div>

        <h1 className="mt-8 text-5xl font-black leading-[0.95] sm:text-7xl">
          {list.name}
        </h1>
        {list.description && (
          <p className="mt-5 max-w-xl text-base leading-7 text-white/72 sm:text-lg">
            {list.description}
          </p>
        )}
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-white/45">
          {list.movies.length} movies and series
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-2">
        {coverMovies.map((item, index) => (
          <div
            key={item.id}
            className={`relative overflow-hidden rounded-sm bg-white/[0.05] ${
              index === 0 ? "col-span-2 aspect-[16/10]" : "aspect-[2/3]"
            }`}
          >
            {item.movie.poster_path || item.movie.backdrop_path ? (
              <Image
                src={imageUrl(item.movie.poster_path || item.movie.backdrop_path)}
                alt={item.movie.title}
                fill
                sizes="(min-width: 640px) 180px, 32vw"
                className="object-cover"
              />
            ) : (
              <Clapperboard className="m-auto h-full w-8 text-white/35" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function MovieSlide({ item }: { item: ListMovieItem }) {
  const movie = item.movie;
  const year = getYear(movie);

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-5 sm:grid-cols-[340px_1fr] sm:items-end">
      <div className="relative mx-auto aspect-[2/3] w-[min(62vw,280px)] overflow-hidden rounded-md border border-white/10 bg-white/[0.05] shadow-2xl shadow-black/60 sm:w-full">
        {movie.poster_path ? (
          <Image
            src={imageUrl(movie.poster_path)}
            alt={movie.title}
            fill
            priority
            sizes="(min-width: 640px) 340px, 62vw"
            className="object-cover"
          />
        ) : (
          <Clapperboard className="m-auto h-full w-14 text-white/35" />
        )}
      </div>

      <div className="pb-2">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
          #{item.position + 1} in the list
        </p>
        <h2 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">
          {movie.title}
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-white/72">
          <span>{movie.mediaType === "tv" ? "Series" : "Movie"}</span>
          {year && <span>{year}</span>}
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-300 text-yellow-300" />
            {movie.vote_average.toFixed(1)}
          </span>
        </div>
        {movie.genres.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {movie.genres.slice(0, 4).map((genre) => (
              <span
                key={genre}
                className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs font-bold text-white/72"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
        <p className="mt-5 line-clamp-5 max-w-2xl text-sm leading-6 text-white/74 sm:text-base sm:leading-7">
          {movie.overview}
        </p>
      </div>
    </section>
  );
}
