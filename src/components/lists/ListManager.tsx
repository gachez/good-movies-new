"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getShareUrl(slug: string) {
  return `${window.location.origin}/share/lists/${slug}`;
}

export function ListManager() {
  const session = authClient.useSession();
  const currentUser = session.data?.user;
  const [authOpen, setAuthOpen] = useState(false);
  const [lists, setLists] = useState<UserMovieList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const selectedList = useMemo(
    () => lists.find((list) => list.id === selectedListId) || lists[0] || null,
    [lists, selectedListId]
  );

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    void loadLists();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedList) {
      setDraftName("");
      setDraftDescription("");
      return;
    }

    setSelectedListId(selectedList.id);
    setDraftName(selectedList.name);
    setDraftDescription(selectedList.description);
  }, [selectedList]);

  const loadLists = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/lists");
      if (!response.ok) throw new Error("Could not load lists");
      const data = (await response.json()) as { lists: UserMovieList[] };
      setLists(data.lists);
      setSelectedListId((current) => current || data.lists[0]?.id || null);
    } catch (error) {
      console.error(error);
      toast.error("Could not load your lists.");
    } finally {
      setIsLoading(false);
    }
  };

  const replaceList = (list: UserMovieList) => {
    setLists((current) =>
      current.map((item) => (item.id === list.id ? list : item))
    );
    setSelectedListId(list.id);
  };

  const createList = async () => {
    const name = newListName.trim();
    if (!name) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: newListDescription.trim(),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        list?: UserMovieList;
        error?: string;
      } | null;

      if (!response.ok || !data?.list) {
        throw new Error(data?.error || "Could not create list");
      }

      setLists((current) => [data.list!, ...current]);
      setSelectedListId(data.list.id);
      setNewListName("");
      setNewListDescription("");
      toast.success("List created.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not create list.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveListDetails = async () => {
    if (!selectedList) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/lists/${selectedList.id}`, {
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
    if (!selectedList) return;
    if (!window.confirm(`Delete "${selectedList.name}"?`)) return;

    const response = await fetch(`/api/lists/${selectedList.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      toast.error("Could not delete list.");
      return;
    }

    setLists((current) => current.filter((list) => list.id !== selectedList.id));
    setSelectedListId(null);
    toast.success("List deleted.");
  };

  const persistOrder = async (list: UserMovieList, items: ListMovieItem[]) => {
    const response = await fetch(`/api/lists/${list.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds: items.map((item) => item.id) }),
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
    if (!selectedList) return;

    const index = selectedList.movies.findIndex((item) => item.id === itemId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= selectedList.movies.length) {
      return;
    }

    const nextItems = [...selectedList.movies];
    const [item] = nextItems.splice(index, 1);
    nextItems.splice(nextIndex, 0, item);
    replaceList({ ...selectedList, movies: nextItems });

    try {
      await persistOrder(selectedList, nextItems);
    } catch (error) {
      console.error(error);
      toast.error("Could not reorder list.");
      void loadLists();
    }
  };

  const removeItem = async (itemId: string) => {
    if (!selectedList) return;

    const response = await fetch(
      `/api/lists/${selectedList.id}/items/${itemId}`,
      {
        method: "DELETE",
      }
    );
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
    if (!selectedList) return;

    try {
      const response = await fetch(`/api/lists/${selectedList.id}/share`, {
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
        <section className="mx-auto max-w-xl px-5 pt-8">
          <BrandLink className="text-xl" />
          <div className="mt-10 rounded-md border border-white/10 bg-white/[0.04] p-6 text-center">
            <Clapperboard className="mx-auto h-10 w-10 text-cyan-200" />
            <h1 className="mt-4 text-2xl font-black">Create movie lists</h1>
            <p className="mt-3 text-sm leading-6 text-white/62">
              Sign in to save movies and series into private lists, then share
              selected lists as cinematic stories.
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
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-5">
        <header className="flex items-center justify-between gap-4">
          <div>
            <BrandLink className="text-xl" />
            <h1 className="mt-5 text-3xl font-black sm:text-5xl">Lists</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">
              Build private movie and series collections. Sharing a list turns
              it into a permanent FlickBuddy story link.
            </p>
          </div>
          <Button
            onClick={shareList}
            disabled={!selectedList || selectedList.movies.length === 0}
            className="bg-cyan-300 font-bold text-black hover:bg-cyan-200"
          >
            <Send className="h-4 w-4" />
            Share
          </Button>
        </header>

        <section className="mt-7 grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-3">
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-cyan-200">
                <Plus className="h-4 w-4" />
                New list
              </div>
              <div className="space-y-3">
                <Input
                  value={newListName}
                  onChange={(event) => setNewListName(event.target.value)}
                  placeholder="Name"
                  className="border-white/10 bg-black/20 text-white"
                />
                <textarea
                  value={newListDescription}
                  onChange={(event) => setNewListDescription(event.target.value)}
                  placeholder="Description (optional)"
                  rows={3}
                  className="w-full resize-none rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none placeholder:text-white/35 focus:border-cyan-300/60"
                />
                <Button
                  onClick={createList}
                  disabled={isSaving || !newListName.trim()}
                  className="w-full bg-white font-bold text-black hover:bg-white/90"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-white/10 bg-white/[0.035] p-2">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 p-6 text-sm text-white/55">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading lists
                </div>
              ) : lists.length > 0 ? (
                <div className="space-y-1">
                  {lists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => setSelectedListId(list.id)}
                      className={`w-full rounded-sm px-3 py-3 text-left transition ${
                        selectedList?.id === list.id
                          ? "bg-white text-black"
                          : "text-white/75 hover:bg-white/[0.05]"
                      }`}
                    >
                      <span className="block truncate text-sm font-bold">
                        {list.name}
                      </span>
                      <span
                        className={`mt-1 block text-xs ${
                          selectedList?.id === list.id
                            ? "text-black/55"
                            : "text-white/42"
                        }`}
                      >
                        {list.movies.length} titles
                        {list.isPublic ? " / shared" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-5 text-sm leading-6 text-white/52">
                  No lists yet. Create one, then save movies from the feed or
                  movie detail pages.
                </div>
              )}
            </div>
          </aside>

          <section className="min-w-0 rounded-md border border-white/10 bg-white/[0.035] p-4">
            {selectedList ? (
              <div>
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
                      className="w-full resize-none rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm leading-6 outline-none placeholder:text-white/35 focus:border-cyan-300/60"
                    />
                    <div className="flex flex-wrap gap-2 text-xs text-white/45">
                      <span>Created {formatDate(selectedList.createdAt)}</span>
                      <span>{selectedList.movies.length} titles</span>
                      {selectedList.shareSlug && (
                        <button
                          onClick={async () => {
                            await copyTextToClipboard(
                              getShareUrl(selectedList.shareSlug!)
                            );
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
                  <div className="flex gap-2 sm:flex-col">
                    <Button
                      onClick={saveListDetails}
                      disabled={isSaving || !draftName.trim()}
                      className="flex-1 bg-white font-bold text-black hover:bg-white/90 sm:flex-none"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={deleteList}
                      variant="outline"
                      className="flex-1 border-red-300/30 bg-red-500/10 text-red-100 hover:bg-red-500/20 sm:flex-none"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {selectedList.movies.length > 0 ? (
                    selectedList.movies.map((item, index) => (
                      <MovieRow
                        key={item.id}
                        item={item}
                        index={index}
                        total={selectedList.movies.length}
                        onMove={moveItem}
                        onRemove={removeItem}
                      />
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-white/15 p-8 text-center">
                      <Clapperboard className="mx-auto h-9 w-9 text-white/35" />
                      <p className="mt-3 font-bold">This list is empty</p>
                      <p className="mt-2 text-sm text-white/50">
                        Save a movie from the feed or a movie detail page to add
                        it here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-80 items-center justify-center text-center text-white/55">
                Choose or create a list to get started.
              </div>
            )}
          </section>
        </section>
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
    <div className="grid grid-cols-[64px_1fr_auto] gap-3 rounded-md border border-white/10 bg-black/18 p-2">
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
