import { randomUUID } from "node:crypto";
import { db, ensureAppTables } from "@/lib/db";
import { Movie, MovieListItem } from "@/types/movie";

export type MovieInteractionAction =
  | "like"
  | "dislike"
  | "save"
  | "watch"
  | "rate"
  | "share";

export interface MediaSeed {
  id: number;
  mediaType: "movie" | "tv";
}

interface StoredInteraction {
  movie_id: number;
  action: MovieInteractionAction;
  value: number | null;
}

interface StoredMovieSnapshot {
  movie_id: number;
  data: string;
}

ensureAppTables();

export function saveMovieSnapshot(movie: Movie) {
  db.prepare(
    `
      INSERT INTO movie_snapshot (movie_id, data, updated_at)
      VALUES (@movieId, @data, datetime('now'))
      ON CONFLICT(movie_id)
      DO UPDATE SET data = excluded.data, updated_at = datetime('now')
    `
  ).run({
    movieId: movie.id,
    data: JSON.stringify(movie),
  });
}

export function upsertMovieInteraction({
  userId,
  movie,
  action,
  value = null,
}: {
  userId: string;
  movie: Movie;
  action: MovieInteractionAction;
  value?: number | null;
}) {
  saveMovieSnapshot(movie);

  db.prepare(
    `
      INSERT INTO movie_interaction (id, user_id, movie_id, action, value, created_at)
      VALUES (@id, @userId, @movieId, @action, @value, datetime('now'))
      ON CONFLICT(user_id, movie_id, action)
      DO UPDATE SET value = excluded.value, created_at = datetime('now')
    `
  ).run({
    id: randomUUID(),
    userId,
    movieId: movie.id,
    action,
    value,
  });

  if (action === "like") {
    removeMovieInteraction(userId, movie.id, "dislike");
  }

  if (action === "dislike") {
    removeMovieInteraction(userId, movie.id, "like");
  }
}

export function removeMovieInteraction(
  userId: string,
  movieId: number,
  action: MovieInteractionAction
) {
  db.prepare(
    `
      DELETE FROM movie_interaction
      WHERE user_id = ? AND movie_id = ? AND action = ?
    `
  ).run(userId, movieId, action);
}

export function getUserInteractions(userId: string) {
  return db
    .prepare(
      `
        SELECT movie_id, action, value
        FROM movie_interaction
        WHERE user_id = ?
      `
    )
    .all(userId) as StoredInteraction[];
}

export function getUserMoviesByAction(
  userId: string,
  action: MovieInteractionAction
): MovieListItem[] {
  const rows = db
    .prepare(
      `
        SELECT ms.movie_id, ms.data
        FROM movie_interaction mi
        JOIN movie_snapshot ms ON ms.movie_id = mi.movie_id
        WHERE mi.user_id = ? AND mi.action = ?
        ORDER BY mi.created_at DESC
      `
    )
    .all(userId, action) as StoredMovieSnapshot[];

  return rows.map((row) => ({
    ...(JSON.parse(row.data) as Movie),
    added_at: new Date().toISOString(),
  }));
}

export function getUserTastePayload(userId: string) {
  const interactions = getUserInteractions(userId);
  const likedMovieIds = interactions
    .filter((interaction) => interaction.action === "like")
    .map((interaction) => interaction.movie_id);
  const dislikedMovieIds = interactions
    .filter((interaction) => interaction.action === "dislike")
    .map((interaction) => interaction.movie_id);
  const savedMovieIds = interactions
    .filter((interaction) => interaction.action === "save")
    .map((interaction) => interaction.movie_id);
  const watchedMovieIds = interactions
    .filter((interaction) => interaction.action === "watch")
    .map((interaction) => interaction.movie_id);

  const likedMovies = getUserMoviesByAction(userId, "like");
  const dislikedMovies = getUserMoviesByAction(userId, "dislike");
  const savedMovies = getUserMoviesByAction(userId, "save");
  const watchedMovies = getUserMoviesByAction(userId, "watch");

  const toSeed = (movie: Movie): MediaSeed => ({
    id: movie.id,
    mediaType: movie.mediaType === "tv" ? "tv" : "movie",
  });
  const excludeKeys = Array.from(
    new Set(
      [...likedMovies, ...dislikedMovies, ...savedMovies, ...watchedMovies].map(
        (movie) => `${movie.mediaType === "tv" ? "tv" : "movie"}:${movie.id}`
      )
    )
  );

  return {
    likedMovieIds,
    dislikedMovieIds,
    savedMovieIds,
    watchedMovieIds,
    likedSeeds: likedMovies.map(toSeed),
    savedSeeds: savedMovies.map(toSeed),
    excludeKeys,
    likedGenres: Array.from(
      new Set(likedMovies.flatMap((movie) => movie.genres || []))
    ),
    dislikedGenres: Array.from(
      new Set(dislikedMovies.flatMap((movie) => movie.genres || []))
    ),
    excludeMovieIds: Array.from(
      new Set([
        ...likedMovieIds,
        ...dislikedMovieIds,
        ...savedMovieIds,
        ...watchedMovieIds,
      ])
    ),
  };
}
