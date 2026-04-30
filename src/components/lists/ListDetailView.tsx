"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Clapperboard,
  Copy,
  Loader2,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { AppNav } from "@/components/AppNav";
import { AuthNudge } from "@/components/auth/AuthNudge";
import { BackButton } from "@/components/BackButton";
import { BrandLink } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { Movie } from "@/types/movie";
import { copyTextToClipboard, shareOrCopy } from "@/utils/share";

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

const posterUrl = (path: string) => `https://image.tmdb.org/t/p/w500${path}`;

function getShareUrl(slug: string) {
  return `${window.location.origin}/share/lists/${slug}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function ListDetailView({ listId }: { listId: string }) {
  const router = useRouter();
  const session = authClient.useSession();
  const currentUser = session.data?.user;
  const [authOpen, setAuthOpen] = useState(false);
  const [list, setList] = useState<UserMovieList | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadList = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/lists/${listId}`);
      if (!response.ok) throw new Error("Could not load list");
      const data = (await response.json()) as { list: UserMovieList };
      setList(data.list);
    } catch (error) {
      console.error(error);
      toast.error("Could not load this list.");
    } finally {
      setIsLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    void loadList();
  }, [currentUser, loadList]);

  useEffect(() => {
    if (!list) return;
    setDraftName(list.name);
    setDraftDescription(list.description);
  }, [list]);

  const replaceList = (nextList: UserMovieList) => {
    setList(nextList);
  };

  const saveListDetails = async () => {
    if (!list) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/lists/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName,
          description: draftDescription,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        list?: UserMovieList;
        error?: string;
      } | null;

      if (!response.ok || !data?.list) {
        throw new Error(data?.error || "Could not update list");
      }

      replaceList(data.list);
      toast.success("List updated.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not update list.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteList = async () => {
    if (!list) return;
    if (!window.confirm(`Delete "${list.name}"?`)) return;

    const response = await fetch(`/api/lists/${list.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      toast.error("Could not delete list.");
      return;
    }

    toast.success("List deleted.");
    router.push("/profile?tab=lists");
  };

  const persistOrder = async (nextItems: ListMovieItem[]) => {
    if (!list) return;

    const response = await fetch(`/api/lists/${list.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds: nextItems.map((item) => item.id) }),
    });
    const data = (await response.json().catch(() => null)) as {
      list?: UserMovieList;
    } | null;

    if (!response.ok || !data?.list) {
      throw new Error("Could not reorder list");
    }

    replaceList(data.list);
  };

  const moveItem = async (itemId: string, direction: -1 | 1) => {
    if (!list) return;

    const index = list.movies.findIndex((item) => item.id === itemId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= list.movies.length) return;

    const nextItems = [...list.movies];
    const [item] = nextItems.splice(index, 1);
    nextItems.splice(nextIndex, 0, item);
    replaceList({ ...list, movies: nextItems });

    try {
      await persistOrder(nextItems);
    } catch (error) {
      console.error(error);
      toast.error("Could not reorder list.");
      void loadList();
    }
  };

  const removeItem = async (itemId: string) => {
    if (!list) return;

    const response = await fetch(`/api/lists/${list.id}/items/${itemId}`, {
      method: "DELETE",
    });
    const data = (await response.json().catch(() => null)) as {
      list?: UserMovieList;
    } | null;

    if (!response.ok || !data?.list) {
      toast.error("Could not remove title.");
      return;
    }

    replaceList(data.list);
  };

  const shareList = async () => {
    if (!list) return;

    try {
      const response = await fetch(`/api/lists/${list.id}/share`, {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as {
        list?: UserMovieList;
      } | null;

      if (!response.ok || !data?.list?.shareSlug) {
        throw new Error("Could not create share link");
      }

      replaceList(data.list);
      const url = getShareUrl(data.list.shareSlug);
      const result = await shareOrCopy({
        title: data.list.name,
        text: `Watch my FlickBuddy list: ${data.list.name}`,
        url,
      });
      if (result === "copied") toast.success("Share link copied.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not share list.");
    }
  };

  if (!currentUser && !isLoading) {
    return (
      <main className="min-h-dvh bg-[#05080b] pb-24 text-white">
        <Toaster position="top-center" />
        <section className="mx-auto max-w-xl px-5 pt-5">
          <BackButton
            fallbackHref="/profile?tab=lists"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]"
          />
          <div className="mt-10 rounded-md border border-white/10 bg-white/[0.04] p-6 text-center">
            <Clapperboard className="mx-auto h-10 w-10 text-cyan-200" />
            <h1 className="mt-4 text-2xl font-black">Sign in to view lists</h1>
            <p className="mt-3 text-sm leading-6 text-white/62">
              Your FlickBuddy lists are private to your account until you share
              them.
            </p>
            <Button
              onClick={() => setAuthOpen(true)}
              className="mt-6 bg-cyan-300 font-bold text-black hover:bg-cyan-200"
            >
              Create account
            </Button>
          </div>
        </section>
        <AuthNudge
          open={authOpen}
          onOpenChange={setAuthOpen}
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
        <header className="flex items-center justify-between gap-3">
          <BackButton
            fallbackHref="/profile?tab=lists"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]"
          />
          <BrandLink className="text-xl" />
        </header>

        {isLoading ? (
          <div className="mt-10 flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] p-8 text-white/60">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading list
          </div>
        ) : list ? (
          <div className="mt-7">
            <section className="rounded-md border border-white/10 bg-white/[0.04] p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                <div className="space-y-3">
                  <Input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    className="h-12 border-white/10 bg-black/20 text-lg font-black text-white"
                  />
                  <textarea
                    value={draftDescription}
                    onChange={(event) => setDraftDescription(event.target.value)}
                    placeholder="Description (optional)"
                    rows={3}
                    className="w-full resize-none rounded-md border border-white/10 bg-black/20 px-3 py-2 text-base leading-6 outline-none placeholder:text-white/35 focus:border-cyan-300/60 md:text-sm"
                  />
                  <div className="flex flex-wrap gap-2 text-xs text-white/45">
                    <span>Created {formatDate(list.createdAt)}</span>
                    <span>{list.movies.length} titles</span>
                    <span>{list.isPublic ? "Shared" : "Private"}</span>
                    {list.shareSlug && (
                      <button
                        onClick={async () => {
                          await copyTextToClipboard(getShareUrl(list.shareSlug!));
                          toast.success("Share link copied.");
                        }}
                        className="flex items-center gap-1 text-cyan-200"
                      >
                        <Copy className="h-3 w-3" />
                        Copy story link
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-col">
                  <Button
                    onClick={saveListDetails}
                    disabled={isSaving || !draftName.trim()}
                    className="bg-white font-bold text-black hover:bg-white/90"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={shareList}
                    disabled={list.movies.length === 0}
                    className="bg-cyan-300 font-bold text-black hover:bg-cyan-200"
                  >
                    <Send className="h-4 w-4" />
                    Share
                  </Button>
                  <Button
                    onClick={deleteList}
                    variant="outline"
                    className="border-red-300/30 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </section>

            <section className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
                    Titles
                  </p>
                  <h1 className="mt-1 text-2xl font-black sm:text-4xl">
                    {list.name}
                  </h1>
                </div>
                <Link
                  href="/search"
                  className="flex items-center gap-2 rounded-md border border-white/12 px-3 py-2 text-sm font-bold text-white/70"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Link>
              </div>

              <div className="space-y-2">
                {list.movies.length > 0 ? (
                  list.movies.map((item, index) => (
                    <MovieRow
                      key={item.id}
                      item={item}
                      index={index}
                      total={list.movies.length}
                      onMove={moveItem}
                      onRemove={removeItem}
                    />
                  ))
                ) : (
                  <div className="rounded-md border border-dashed border-white/15 p-8 text-center">
                    <Clapperboard className="mx-auto h-9 w-9 text-white/35" />
                    <p className="mt-3 font-bold">This list is empty</p>
                    <p className="mt-2 text-sm text-white/50">
                      Open Search or the feed, choose Save, then add titles to
                      this list.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="mt-10 rounded-md border border-dashed border-white/15 p-8 text-center">
            <p className="font-bold">List not found</p>
            <p className="mt-2 text-sm text-white/55">
              It may have been deleted or belongs to another account.
            </p>
          </div>
        )}
      </section>

      <AppNav />
    </main>
  );
}

function MovieRow({
  item,
  index,
  total,
  onMove,
  onRemove,
}: {
  item: ListMovieItem;
  index: number;
  total: number;
  onMove: (itemId: string, direction: -1 | 1) => void;
  onRemove: (itemId: string) => void;
}) {
  const movie = item.movie;
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;

  return (
    <div className="grid grid-cols-[64px_1fr_auto] gap-3 rounded-md border border-white/10 bg-white/[0.035] p-2">
      <Link
        href={`/movie/${movie.id}?type=${movie.mediaType === "tv" ? "tv" : "movie"}`}
        className="relative h-24 overflow-hidden rounded-sm bg-white/[0.05]"
      >
        {movie.poster_path ? (
          <Image
            src={posterUrl(movie.poster_path)}
            alt={movie.title}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <Clapperboard className="m-auto h-full w-7 text-white/35" />
        )}
      </Link>
      <div className="min-w-0 py-1">
        <Link
          href={`/movie/${movie.id}?type=${movie.mediaType === "tv" ? "tv" : "movie"}`}
          className="line-clamp-2 font-bold leading-tight hover:text-cyan-200"
        >
          {movie.title}
        </Link>
        <p className="mt-1 text-xs text-white/45">
          #{index + 1} / {movie.mediaType === "tv" ? "Series" : "Movie"}
          {year ? ` / ${year}` : ""}
        </p>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/58">
          {movie.overview}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={() => onMove(item.id, -1)}
          disabled={index === 0}
          aria-label={`Move ${movie.title} up`}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 bg-white/[0.04] text-white/70 disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => onMove(item.id, 1)}
          disabled={index === total - 1}
          aria-label={`Move ${movie.title} down`}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 bg-white/[0.04] text-white/70 disabled:opacity-30"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
        <button
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${movie.title}`}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-red-300/20 bg-red-500/10 text-red-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
