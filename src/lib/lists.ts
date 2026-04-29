import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { db, ensureAppTables } from "@/lib/db";
import { Movie } from "@/types/movie";

export interface ListMovieItem {
  id: string;
  movie: Movie;
  position: number;
  addedAt: string;
}

export interface UserMovieList {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  shareSlug: string | null;
  createdAt: string;
  updatedAt: string;
  movies: ListMovieItem[];
}

export interface PublicMovieList extends UserMovieList {
  creator: {
    name: string;
    avatarUrl: string | null;
  };
}

interface ListRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_public: number;
  share_slug: string | null;
  created_at: string;
  updated_at: string;
}

interface PublicListRow extends ListRow {
  creator_name: string | null;
  creator_image: string | null;
  creator_email: string | null;
}

interface ListItemRow {
  id: string;
  movie_data: string;
  position: number;
  created_at: string;
}

ensureAppTables();

function toList(row: ListRow, movies: ListMovieItem[]): UserMovieList {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isPublic: row.is_public === 1,
    shareSlug: row.share_slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    movies,
  };
}

function parseMovie(data: string): Movie | null {
  try {
    return JSON.parse(data) as Movie;
  } catch {
    return null;
  }
}

function getItemsForList(listId: string): ListMovieItem[] {
  const rows = db
    .prepare(
      `
        SELECT id, movie_data, position, created_at
        FROM movie_list_item
        WHERE list_id = ?
        ORDER BY position ASC, created_at ASC
      `
    )
    .all(listId) as ListItemRow[];

  return rows.flatMap((row) => {
    const movie = parseMovie(row.movie_data);
    if (!movie) return [];
    return [
      {
        id: row.id,
        movie,
        position: row.position,
        addedAt: row.created_at,
      },
    ];
  });
}

function sanitizeText(value: unknown, fallback = "", maxLength = 120) {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, maxLength);
}

export function normalizeListName(value: unknown) {
  return sanitizeText(value, "", 80);
}

export function normalizeListDescription(value: unknown) {
  return sanitizeText(value, "", 300);
}

export function normalizeMoviePayload(value: unknown): Movie | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Record<string, unknown>;
  const id = Number(input.id);
  const title = sanitizeText(input.title, "", 180);
  const mediaType = input.mediaType === "tv" ? "tv" : "movie";

  if (!Number.isInteger(id) || id <= 0 || !title) return null;

  const numberValue = (key: string) => {
    const parsed = Number(input[key]);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const booleanValue = (key: string) => input[key] === true;
  const stringArray = (key: string, maxItems: number, maxItemLength = 80) => {
    const raw = input[key];
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().slice(0, maxItemLength))
      .filter(Boolean)
      .slice(0, maxItems);
  };
  const numberArray = (key: string, maxItems: number) => {
    const raw = input[key];
    if (!Array.isArray(raw)) return [];
    return raw
      .map(Number)
      .filter((item) => Number.isInteger(item))
      .slice(0, maxItems);
  };

  return {
    id,
    title,
    original_title: sanitizeText(input.original_title, title, 180),
    original_language: sanitizeText(input.original_language, "", 20),
    overview: sanitizeText(input.overview, "", 900),
    release_date: sanitizeText(input.release_date, "", 40),
    poster_path: sanitizeText(input.poster_path, "", 220),
    backdrop_path: sanitizeText(input.backdrop_path, "", 220),
    popularity: numberValue("popularity"),
    vote_average: numberValue("vote_average"),
    vote_count: numberValue("vote_count"),
    adult: booleanValue("adult"),
    video: booleanValue("video"),
    genre_ids: numberArray("genre_ids", 12),
    genres: stringArray("genres", 12),
    relevanceScore: numberValue("relevanceScore"),
    matchReason: sanitizeText(input.matchReason, "", 500) || undefined,
    matchCaveat: sanitizeText(input.matchCaveat, "", 300) || undefined,
    highlightedThemes: stringArray("highlightedThemes", 8),
    hasContentAnalysis: booleanValue("hasContentAnalysis"),
    mediaType,
    trailerKey: sanitizeText(input.trailerKey, "", 80) || undefined,
    trailerName: sanitizeText(input.trailerName, "", 160) || undefined,
    reviews: [],
    feedReason: sanitizeText(input.feedReason, "", 500) || undefined,
  };
}

export function getUserLists(userId: string): UserMovieList[] {
  const rows = db
    .prepare(
      `
        SELECT id, user_id, name, description, is_public, share_slug, created_at, updated_at
        FROM movie_list
        WHERE user_id = ?
        ORDER BY updated_at DESC
      `
    )
    .all(userId) as ListRow[];

  return rows.map((row) => toList(row, getItemsForList(row.id)));
}

export function createMovieList({
  userId,
  name,
  description,
}: {
  userId: string;
  name: string;
  description: string;
}) {
  const id = randomUUID();

  db.prepare(
    `
      INSERT INTO movie_list (id, user_id, name, description, created_at, updated_at)
      VALUES (@id, @userId, @name, @description, datetime('now'), datetime('now'))
    `
  ).run({ id, userId, name, description });

  return getUserListById(userId, id);
}

export function getUserListById(userId: string, listId: string) {
  const row = db
    .prepare(
      `
        SELECT id, user_id, name, description, is_public, share_slug, created_at, updated_at
        FROM movie_list
        WHERE user_id = ? AND id = ?
      `
    )
    .get(userId, listId) as ListRow | undefined;

  return row ? toList(row, getItemsForList(row.id)) : null;
}

export function updateMovieList({
  userId,
  listId,
  name,
  description,
}: {
  userId: string;
  listId: string;
  name: string;
  description: string;
}) {
  const result = db
    .prepare(
      `
        UPDATE movie_list
        SET name = ?, description = ?, updated_at = datetime('now')
        WHERE user_id = ? AND id = ?
      `
    )
    .run(name, description, userId, listId);

  if (result.changes === 0) return null;
  return getUserListById(userId, listId);
}

export function deleteMovieList(userId: string, listId: string) {
  const result = db
    .prepare("DELETE FROM movie_list WHERE user_id = ? AND id = ?")
    .run(userId, listId);

  return result.changes > 0;
}

function nextPosition(listId: string) {
  const row = db
    .prepare(
      `
        SELECT COALESCE(MAX(position), -1) + 1 as next_position
        FROM movie_list_item
        WHERE list_id = ?
      `
    )
    .get(listId) as { next_position: number };

  return row.next_position;
}

export function addMovieToList({
  userId,
  listId,
  movie,
}: {
  userId: string;
  listId: string;
  movie: Movie;
}) {
  const list = getUserListById(userId, listId);
  if (!list) return null;

  const mediaType = movie.mediaType === "tv" ? "tv" : "movie";

  db.prepare(
    `
      INSERT INTO movie_list_item (
        id,
        list_id,
        movie_id,
        media_type,
        movie_data,
        position,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @listId,
        @movieId,
        @mediaType,
        @movieData,
        @position,
        datetime('now'),
        datetime('now')
      )
      ON CONFLICT(list_id, movie_id, media_type)
      DO UPDATE SET movie_data = excluded.movie_data, updated_at = datetime('now')
    `
  ).run({
    id: randomUUID(),
    listId,
    movieId: movie.id,
    mediaType,
    movieData: JSON.stringify(movie),
    position: nextPosition(listId),
  });

  db.prepare("UPDATE movie_list SET updated_at = datetime('now') WHERE id = ?").run(
    listId
  );

  return getUserListById(userId, listId);
}

export function removeMovieFromList({
  userId,
  listId,
  itemId,
}: {
  userId: string;
  listId: string;
  itemId: string;
}) {
  const result = db
    .prepare(
      `
        DELETE FROM movie_list_item
        WHERE id = ?
          AND list_id = ?
          AND EXISTS (
            SELECT 1 FROM movie_list
            WHERE movie_list.id = movie_list_item.list_id
              AND movie_list.user_id = ?
          )
      `
    )
    .run(itemId, listId, userId);

  if (result.changes === 0) return null;
  db.prepare("UPDATE movie_list SET updated_at = datetime('now') WHERE id = ?").run(
    listId
  );
  compactListPositions(listId);
  return getUserListById(userId, listId);
}

function compactListPositions(listId: string) {
  const items = db
    .prepare(
      `
        SELECT id
        FROM movie_list_item
        WHERE list_id = ?
        ORDER BY position ASC, created_at ASC
      `
    )
    .all(listId) as { id: string }[];

  const update = db.prepare(
    "UPDATE movie_list_item SET position = ?, updated_at = datetime('now') WHERE id = ?"
  );
  const transaction = db.transaction(() => {
    items.forEach((item, index) => update.run(index, item.id));
  });
  transaction();
}

export function reorderListItems({
  userId,
  listId,
  itemIds,
}: {
  userId: string;
  listId: string;
  itemIds: string[];
}) {
  const list = getUserListById(userId, listId);
  if (!list) return null;

  const currentItemIds = new Set(list.movies.map((item) => item.id));
  if (
    itemIds.length !== currentItemIds.size ||
    itemIds.some((itemId) => !currentItemIds.has(itemId))
  ) {
    return null;
  }

  const update = db.prepare(
    `
      UPDATE movie_list_item
      SET position = ?, updated_at = datetime('now')
      WHERE id = ? AND list_id = ?
    `
  );
  const transaction = db.transaction(() => {
    itemIds.forEach((itemId, index) => update.run(index, itemId, listId));
    db.prepare("UPDATE movie_list SET updated_at = datetime('now') WHERE id = ?").run(
      listId
    );
  });
  transaction();

  return getUserListById(userId, listId);
}

function createShareSlug() {
  return randomBytes(8).toString("base64url");
}

export function enableListSharing(userId: string, listId: string) {
  const list = getUserListById(userId, listId);
  if (!list) return null;

  if (list.shareSlug && list.isPublic) return list;

  let slug = list.shareSlug || createShareSlug();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      db.prepare(
        `
          UPDATE movie_list
          SET is_public = 1, share_slug = ?, updated_at = datetime('now')
          WHERE user_id = ? AND id = ?
        `
      ).run(slug, userId, listId);
      return getUserListById(userId, listId);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "SQLITE_CONSTRAINT_UNIQUE"
      ) {
        slug = createShareSlug();
        continue;
      }
      throw error;
    }
  }

  return null;
}

export function getPublicListBySlug(slug: string): PublicMovieList | null {
  const row = db
    .prepare(
      `
        SELECT
          ml.id,
          ml.user_id,
          ml.name,
          ml.description,
          ml.is_public,
          ml.share_slug,
          ml.created_at,
          ml.updated_at,
          u.name as creator_name,
          u.image as creator_image,
          u.email as creator_email
        FROM movie_list ml
        LEFT JOIN "user" u ON u.id = ml.user_id
        WHERE ml.share_slug = ? AND ml.is_public = 1
      `
    )
    .get(slug) as PublicListRow | undefined;

  if (!row) return null;

  const creatorName =
    row.creator_name ||
    row.creator_email?.split("@")[0] ||
    "a FilmRabbit user";

  return {
    ...toList(row, getItemsForList(row.id)),
    creator: {
      name: creatorName,
      avatarUrl: row.creator_image,
    },
  };
}
