"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Movie } from "@/types/movie";

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
  movies: ListMovieItem[];
}

interface ListSelectionModalProps {
  movie: Movie;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (list: UserMovieList) => void;
}

export function ListSelectionModal({
  movie,
  open,
  onOpenChange,
  onSaved,
}: ListSelectionModalProps) {
  const [lists, setLists] = useState<UserMovieList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    async function loadLists() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/lists");
        if (!response.ok) throw new Error("Could not load lists");
        const data = (await response.json()) as { lists: UserMovieList[] };
        setLists(data.lists);
        setSelectedListId(data.lists[0]?.id || null);
      } catch (error) {
        console.error(error);
        toast.error("Could not load your lists.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadLists();
  }, [open]);

  const createList = async () => {
    const name = newListName.trim();
    if (!name) return null;

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
    setNewListName("");
    setNewListDescription("");
    return data.list;
  };

  const handleAddToList = async () => {
    setIsSaving(true);
    try {
      const targetList =
        newListName.trim().length > 0
          ? await createList()
          : lists.find((list) => list.id === selectedListId) || null;

      if (!targetList) {
        toast.error("Choose a list or create a new one.");
        return;
      }

      const response = await fetch(`/api/lists/${targetList.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movie }),
      });

      const data = (await response.json().catch(() => null)) as {
        list?: UserMovieList;
        error?: string;
      } | null;

      if (!response.ok || !data?.list) {
        throw new Error(data?.error || "Could not save movie");
      }

      setLists((current) =>
        current.map((list) => (list.id === data.list!.id ? data.list! : list))
      );
      onSaved?.(data.list);
      toast.success(`Saved to ${data.list.name}.`);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not save movie.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#0b1116] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to a list</DialogTitle>
          <DialogDescription className="text-white/58">
            Save &quot;{movie.title}&quot; to an existing list or create a new one.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] p-5 text-sm text-white/60">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading lists
              </div>
            ) : lists.length > 0 ? (
              lists.map((list) => {
                const isSelected = selectedListId === list.id && !newListName.trim();
                const alreadySaved = list.movies.some(
                  (item) =>
                    item.movie.id === movie.id &&
                    (item.movie.mediaType || "movie") === (movie.mediaType || "movie")
                );

                return (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => {
                      setSelectedListId(list.id);
                      setNewListName("");
                    }}
                    className={`w-full rounded-md border p-3 text-left transition ${
                      isSelected
                        ? "border-cyan-300 bg-cyan-300/12"
                        : "border-white/10 bg-white/[0.035] hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-white">
                          {list.name}
                        </h3>
                        <p className="mt-1 line-clamp-1 text-xs text-white/50">
                          {list.description || `${list.movies.length} saved titles`}
                        </p>
                      </div>
                      {isSelected ? (
                        <Check className="h-5 w-5 shrink-0 text-cyan-200" />
                      ) : alreadySaved ? (
                        <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold uppercase text-white/45">
                          Saved
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-md border border-dashed border-white/15 p-4 text-sm text-white/55">
                No lists yet. Create your first one below.
              </div>
            )}
          </div>

          <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-cyan-200">
              <Plus className="h-4 w-4" />
              New list
            </div>
            <div className="space-y-3">
              <Input
                value={newListName}
                onChange={(event) => setNewListName(event.target.value)}
                placeholder="List name"
                className="border-white/10 bg-black/20 text-white placeholder:text-white/35"
              />
              <textarea
                value={newListDescription}
                onChange={(event) => setNewListDescription(event.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full resize-none rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/60"
              />
            </div>
          </div>

          <Button
            className="w-full bg-cyan-300 font-bold text-black hover:bg-cyan-200"
            onClick={handleAddToList}
            disabled={
              isSaving ||
              isLoading ||
              (!selectedListId && newListName.trim().length === 0)
            }
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save to List
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
