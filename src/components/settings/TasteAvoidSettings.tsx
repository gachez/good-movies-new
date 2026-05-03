"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  AvoidPreferences,
  addAvoidPreferences,
  avoidGenreOptions,
  readAvoidPreferences,
  saveAvoidPreferences,
  sanitizeAvoidPreferences,
} from "@/utils/tastePreferences";
import { getClientId, trackEvent } from "@/utils/analytics";

function termsToDraft(terms: string[]) {
  return terms.join(", ");
}

function draftToTerms(draft: string) {
  return draft
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 40);
}

export function TasteAvoidSettings() {
  const session = authClient.useSession();
  const isAuthed = Boolean(session.data?.user);
  const [genres, setGenres] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");

  const terms = useMemo(() => draftToTerms(draft), [draft]);

  useEffect(() => {
    const localPreferences = readAvoidPreferences();
    setGenres(localPreferences.genres);
    setDraft(termsToDraft(localPreferences.terms));
  }, []);

  useEffect(() => {
    if (!isAuthed) return;

    let cancelled = false;
    fetch("/api/taste-preferences", {
      headers: { "x-flickbuddy-client-id": getClientId() },
    })
      .then((response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ preferences?: AvoidPreferences }>;
      })
      .then((data) => {
        if (cancelled || !data?.preferences) return;

        const merged = addAvoidPreferences(readAvoidPreferences(), data.preferences);
        saveAvoidPreferences(merged);
        setGenres(merged.genres);
        setDraft(termsToDraft(merged.terms));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isAuthed]);

  const toggleGenre = (genre: string) => {
    setStatus("");
    setGenres((current) =>
      current.includes(genre)
        ? current.filter((item) => item !== genre)
        : [...current, genre]
    );
  };

  const removeTerm = (term: string) => {
    setStatus("");
    setDraft(termsToDraft(terms.filter((item) => item !== term)));
  };

  const save = async () => {
    const preferences = sanitizeAvoidPreferences({ genres, terms });
    setIsSaving(true);
    setStatus("");
    saveAvoidPreferences(preferences);

    try {
      if (isAuthed) {
        const response = await fetch("/api/taste-preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-flickbuddy-client-id": getClientId(),
          },
          body: JSON.stringify(preferences),
        });
        if (!response.ok) throw new Error("Could not save avoid preferences");
      }

      trackEvent("avoid_preferences_saved", {
        metadata: {
          avoidedGenreCount: preferences.genres.length,
          avoidTermCount: preferences.terms.length,
          authenticated: isAuthed,
        },
      });
      setStatus("Avoid preferences saved.");
    } catch {
      setStatus("Saved on this device. Sign in again to sync to your account.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mt-8 rounded-md border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-black text-white">Avoid in recommendations</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Pick genres and add titles, actors, themes, or vibes FlickBuddy should avoid.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={isSaving}
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 text-sm font-black text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {avoidGenreOptions.map((genre) => (
          <button
            key={genre}
            type="button"
            onClick={() => toggleGenre(genre)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
              genres.includes(genre)
                ? "border-red-200 bg-red-200 text-black"
                : "border-white/12 bg-black/16 text-white/62"
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      <label className="mt-3 block">
        <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-white/45">
          Titles, actors, themes, or vibes
        </span>
        <textarea
          value={draft}
          onChange={(event) => {
            setStatus("");
            setDraft(event.target.value);
          }}
          rows={3}
          placeholder="Marvel, reality dating, slow dramas"
          className="min-h-24 w-full resize-none rounded-md border border-white/10 bg-black/22 px-3 py-3 text-sm font-semibold leading-6 text-white outline-none placeholder:text-white/32 focus:border-cyan-300/50"
        />
      </label>

      {terms.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {terms.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => removeTerm(term)}
              className="flex items-center gap-1 rounded-full border border-red-200/20 bg-red-200/10 px-3 py-1.5 text-xs font-bold text-red-50"
            >
              {term}
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      )}

      {status && <p className="mt-3 text-sm font-bold text-cyan-100/80">{status}</p>}
    </section>
  );
}
