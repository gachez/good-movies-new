"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Clapperboard,
  Grid3X3,
  List,
  Lock,
  Sparkles,
  Star,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { AppNav } from "@/components/AppNav";
import { AuthNudge } from "@/components/auth/AuthNudge";
import { BrandLink, BrandLogo } from "@/components/BrandLogo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import posthog from "posthog-js";
import { authClient } from "@/lib/auth-client";
import { Movie, MovieListItem } from "@/types/movie";

const posterUrl = (path: string) => `https://image.tmdb.org/t/p/w500${path}`;

interface ListMovieItem {
  id: string;
  movie: Movie;
  position: number;
  addedAt: string;
}

interface UserMovieList {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  shareSlug: string | null;
  createdAt: string;
  updatedAt: string;
  movies: ListMovieItem[];
}

export default function ProfilePage() {
  const [likedMovies, setLikedMovies] = useState<MovieListItem[]>([]);
  const [savedMovies, setSavedMovies] = useState<MovieListItem[]>([]);
  const [movieLists, setMovieLists] = useState<UserMovieList[]>([]);
  const [activeTab, setActiveTab] = useState<"liked" | "saved" | "lists">(
    "liked"
  );
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [isListsLoading, setIsListsLoading] = useState(false);
  const session = authClient.useSession();
  const currentUser = session.data?.user;
  const isSessionLoading = Boolean(
    (session as { isPending?: boolean }).isPending
  );
  const displayName = currentUser?.name || "Your FlickBuddy";
  const displayHandle =
    currentUser?.email || (currentUser ? "FlickBuddy member" : "Taste Profile");
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "saved" || tab === "lists") {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    async function loadProfileMovies() {
      if (!currentUser) {
        setLikedMovies([]);
        setSavedMovies([]);
        return;
      }

      const response = await fetch("/api/interactions");
      if (response.ok) {
        const data = (await response.json()) as {
          liked: MovieListItem[];
          saved: MovieListItem[];
        };
        setLikedMovies(data.liked);
        setSavedMovies(data.saved);
      }
    }

    void loadProfileMovies();
  }, [currentUser]);

  useEffect(() => {
    async function loadMovieLists() {
      if (!currentUser) {
        setMovieLists([]);
        return;
      }

      setIsListsLoading(true);
      try {
        const response = await fetch("/api/lists");
        if (!response.ok) throw new Error("Could not load lists");
        const data = (await response.json()) as { lists: UserMovieList[] };
        setMovieLists(data.lists);
      } catch (error) {
        console.error(error);
        toast.error("Could not load your lists.");
      } finally {
        setIsListsLoading(false);
      }
    }

    void loadMovieLists();
  }, [currentUser]);

  const activeMovies = activeTab === "liked" ? likedMovies : savedMovies;
  const topGenres = useMemo(() => {
    const genreCounts = new Map<string, number>();
    likedMovies.forEach((movie) => {
      movie.genres?.forEach((genre) => {
        genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
      });
    });

    return Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);
  }, [likedMovies]);

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  if (isSessionLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#05080b] px-6 text-white">
        <div className="text-center">
          <Clapperboard className="mx-auto h-10 w-10 text-cyan-200" />
          <p className="mt-4 text-sm font-bold text-white/70">
            Loading your profile...
          </p>
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="min-h-dvh bg-[#05080b] px-5 pb-24 pt-5 text-white">
        <Toaster position="top-center" />
        <section className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col">
          <header className="flex items-center justify-between">
            <BrandLink className="text-xl" />
            <button
              onClick={() => openAuth("signin")}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold"
            >
              Log in
            </button>
          </header>

          <div className="flex flex-1 items-center">
            <section className="w-full rounded-md border border-cyan-300/18 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-8">
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
                Personalization needs an account
              </p>
              <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                Create an account to build your taste profile and get personalized recommendations
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/68">
                FlickBuddy uses your likes, passes, saves, watched titles, and
                feedback to build the best recommendations for you.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <ProfileBenefit title="Save taste" text="Keep likes, passes, and saves." />
                <ProfileBenefit title="Tune picks" text="Improve your feed over time." />
                <ProfileBenefit title="Build lists" text="Create and share watchlists." />
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => openAuth("signup")}
                  className="rounded-md bg-cyan-300 px-5 py-3 text-sm font-black text-black transition hover:bg-cyan-200"
                >
                  Create account
                </button>
                <Link
                  href="/discover"
                  className="rounded-md border border-white/12 px-5 py-3 text-center text-sm font-bold text-white/75 transition hover:border-white/25 hover:text-white"
                >
                  Try discovery first
                </Link>
              </div>
            </section>
          </div>
        </section>

        <AuthNudge
          open={authOpen}
          onOpenChange={setAuthOpen}
          initialMode={authMode}
          onAuthed={() => {
            void session.refetch();
          }}
        />
        <AppNav />
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#05080b] pb-24 text-white">
      <Toaster position="top-center" />
      <section className="mx-auto max-w-5xl px-4 pb-8 pt-5">
        <header className="flex items-center justify-between">
          <BrandLink className="text-xl" />
          <div className="flex items-center gap-2">
            {currentUser ? (
              <button
                onClick={async () => {
                  posthog.capture("user_signed_out");
                  posthog.reset();
                  await authClient.signOut();
                  await session.refetch();
                }}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold"
              >
                Log out
              </button>
            ) : (
              <button
                onClick={() => openAuth("signin")}
                className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold text-black"
              >
                Log in
              </button>
            )}
          </div>
        </header>

        <section className="mt-7 rounded-md border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
          <div className="flex items-start gap-5">
            <Avatar className="h-24 w-24 border border-cyan-300/30 bg-cyan-300/15">
              {currentUser?.image ? (
                <div
                  aria-label={displayName}
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${currentUser.image})` }}
                />
              ) : (
                <AvatarFallback className="bg-cyan-300/15 text-xl font-black text-cyan-100">
                  {currentUser ? initials || "FR" : <BrandLogo size={44} />}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="text-sm uppercase tracking-[0.22em] text-cyan-300">
                {displayHandle}
              </p>
              <h1 className="mt-1 truncate text-3xl font-bold">{displayName}</h1>
              {currentUser && (
                <p className="mt-1 text-sm font-semibold text-white/52">
                  FlickBuddy profile
                </p>
              )}
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <Stat label="liked" value={likedMovies.length} />
                <Stat label="saved" value={savedMovies.length} />
                <Stat label="signals" value={likedMovies.length + savedMovies.length} />
              </div>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/70">
            Movies you like and save shape your recommendation feed. The more
            you interact, the sharper this profile gets.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {topGenres.length > 0 ? (
              topGenres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-sm text-cyan-100"
                >
                  {genre}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/55">
                Like movies to build your genre fingerprint
              </span>
            )}
          </div>

        </section>

        <section className="mt-7">
 

          <div className="grid grid-cols-3 gap-3 rounded-md border border-white/10 bg-white/[0.03] p-2">
            <button
              onClick={() => setActiveTab("liked")}
              className={`flex items-center justify-center gap-2 rounded-sm px-4 py-3 text-sm font-bold ${
                activeTab === "liked"
                  ? "bg-white text-black"
                  : "text-white/60 hover:bg-white/[0.04]"
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
              Liked
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`flex items-center justify-center gap-2 rounded-sm px-4 py-3 text-sm font-bold ${
                activeTab === "saved"
                  ? "bg-white text-black"
                  : "text-white/60 hover:bg-white/[0.04]"
              }`}
            >
              <Bookmark className="h-4 w-4" />
              Saved
            </button>
            <button
              onClick={() => setActiveTab("lists")}
              className={`flex items-center justify-center gap-2 rounded-sm px-4 py-3 text-sm font-bold ${
                activeTab === "lists"
                  ? "bg-white text-black"
                  : "text-white/60 hover:bg-white/[0.04]"
              }`}
            >
              <List className="h-4 w-4" />
              Lists
            </button>
          </div>

          {activeTab !== "lists" && activeMovies.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-6">
              {activeMovies.map((movie) => (
                <Link
                  key={movie.id}
                  href={`/movie/${movie.id}?type=${movie.mediaType === "tv" ? "tv" : "movie"}`}
                  className="group relative aspect-[2/3] overflow-hidden bg-white/5"
                >
                  <Image
                    src={posterUrl(movie.poster_path)}
                    alt={movie.title}
                    fill
                    sizes="(min-width: 1024px) 16vw, 33vw"
                    className="object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="line-clamp-2 text-xs font-semibold">
                      {movie.title}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-white/70">
                      <Star className="h-3 w-3 fill-yellow-300 text-yellow-300" />
                      {movie.vote_average.toFixed(1)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : activeTab !== "lists" ? (
            <div className="mt-8 rounded-md border border-dashed border-white/15 p-8 text-center">
              <p className="font-semibold">
                {activeTab === "liked" ? "No liked movies yet" : "No saved movies yet"}
              </p>
              <p className="mt-2 text-sm text-white/55">
                {currentUser
                  ? "Use the feed actions to build this collection."
                  : "Log in, then use the feed actions to save your collection."}
              </p>
              {!currentUser && (
                <button
                  onClick={() => openAuth("signup")}
                  className="mt-5 rounded-md bg-cyan-300 px-5 py-3 text-sm font-bold text-black"
                >
                  Create account
                </button>
              )}
            </div>
          ) : null}

          {activeTab === "lists" && (
            <ProfileListsGrid
              lists={movieLists}
              isLoading={isListsLoading}
              isAuthed={!!currentUser}
              onAuth={() => openAuth("signup")}
            />
          )}
        </section>

        <footer className="mt-10 flex flex-wrap gap-4 text-xs font-bold uppercase tracking-[0.14em] text-white/38">
          <Link href="/about" className="hover:text-cyan-200">
            About
          </Link>
          <Link href="/privacy" className="hover:text-cyan-200">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-cyan-200">
            Terms
          </Link>
        </footer>
      </section>

      <AuthNudge
        open={authOpen}
        onOpenChange={setAuthOpen}
        initialMode={authMode}
        onAuthed={() => {
          void session.refetch();
        }}
      />

      <AppNav />
    </main>
  );
}

function ProfileBenefit({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/18 p-4">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-1 text-sm leading-5 text-white/55">{text}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-white/55">{label}</p>
    </div>
  );
}

function ProfileListsGrid({
  lists,
  isLoading,
  isAuthed,
  onAuth,
}: {
  lists: UserMovieList[];
  isLoading: boolean;
  isAuthed: boolean;
  onAuth: () => void;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
            Your lists
          </p>
          <h2 className="mt-1 text-xl font-black">Saved collections</h2>
        </div>
        <Link
          href="/search"
          className="rounded-md border border-white/12 px-3 py-2 text-sm font-bold text-white/70"
        >
          Add titles
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-48 animate-pulse rounded-md border border-white/8 bg-white/[0.04]"
            />
          ))}
        </div>
      ) : !isAuthed ? (
        <div className="rounded-md border border-dashed border-white/15 p-6 text-center">
          <Lock className="mx-auto h-8 w-8 text-white/35" />
          <p className="mt-3 font-bold">Lists are tied to your account</p>
          <p className="mt-2 text-sm text-white/55">
            Create an account to build private lists and share selected ones.
          </p>
          <button
            onClick={onAuth}
            className="mt-5 rounded-md bg-cyan-300 px-5 py-3 text-sm font-bold text-black"
          >
            Create account
          </button>
        </div>
      ) : lists.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-white/15 p-6 text-center">
          <Clapperboard className="mx-auto h-8 w-8 text-white/35" />
          <p className="mt-3 font-bold">No lists yet</p>
          <p className="mt-2 text-sm text-white/55">
            Use Save on a movie or series to create your first collection.
          </p>
        </div>
      )}
    </section>
  );
}

function ListCard({ list }: { list: UserMovieList }) {
  const coverMovies = list.movies.slice(0, 4);

  return (
    <Link
      href={`/profile/lists/${list.id}`}
      className="group overflow-hidden rounded-md border border-white/10 bg-white/[0.04] transition hover:border-cyan-300/40"
    >
      <div className="grid h-40 grid-cols-2 gap-1 bg-black/20 p-1">
        {coverMovies.length > 0 ? (
          coverMovies.map((item) => (
            <div
              key={item.id}
              className="relative overflow-hidden rounded-sm bg-white/[0.05]"
            >
              {item.movie.poster_path ? (
                <Image
                  src={posterUrl(item.movie.poster_path)}
                  alt={item.movie.title}
                  fill
                  sizes="(min-width: 1024px) 16vw, 50vw"
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <Clapperboard className="m-auto h-full w-7 text-white/35" />
              )}
            </div>
          ))
        ) : (
          <div className="col-span-2 flex items-center justify-center rounded-sm bg-white/[0.04]">
            <Clapperboard className="h-10 w-10 text-white/30" />
          </div>
        )}
        {coverMovies.length === 1 && (
          <div className="rounded-sm border border-dashed border-white/10" />
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 font-black leading-tight">{list.name}</h3>
          <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold uppercase text-white/52">
            {list.isPublic ? "Shared" : "Private"}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-white/55">
          {list.description || `${list.movies.length} saved titles`}
        </p>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-cyan-200/80">
          {list.movies.length} movies and series
        </p>
      </div>
    </Link>
  );
}
