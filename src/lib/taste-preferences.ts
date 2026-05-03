import "server-only";

import { db, ensureAppTables } from "@/lib/db";

export interface AvoidPreferences {
  genres: string[];
  terms: string[];
  updatedAt?: string;
}

interface AvoidPreferenceRow {
  user_id: string;
  genres: string;
  terms: string;
  updated_at: string;
}

const MAX_AVOID_GENRES = 24;
const MAX_AVOID_TERMS = 40;
const MAX_AVOID_GENRE_LENGTH = 48;
const MAX_AVOID_TERM_LENGTH = 90;

ensureAppTables();

function safeParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeList(
  values: unknown,
  maxItems: number,
  maxLength: number
) {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") continue;

    const item = value.replace(/\s+/g, " ").trim().slice(0, maxLength);
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;

    seen.add(key);
    normalized.push(item);
    if (normalized.length >= maxItems) break;
  }

  return normalized;
}

function rowToPreferences(row: AvoidPreferenceRow): AvoidPreferences {
  return {
    genres: normalizeList(
      safeParse<string[]>(row.genres, []),
      MAX_AVOID_GENRES,
      MAX_AVOID_GENRE_LENGTH
    ),
    terms: normalizeList(
      safeParse<string[]>(row.terms, []),
      MAX_AVOID_TERMS,
      MAX_AVOID_TERM_LENGTH
    ),
    updatedAt: row.updated_at,
  };
}

export function sanitizeAvoidPreferences(value: unknown): AvoidPreferences {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    genres: normalizeList(
      record.genres,
      MAX_AVOID_GENRES,
      MAX_AVOID_GENRE_LENGTH
    ),
    terms: normalizeList(record.terms, MAX_AVOID_TERMS, MAX_AVOID_TERM_LENGTH),
  };
}

export function mergeAvoidPreferences(
  ...preferences: Array<Partial<AvoidPreferences> | null | undefined>
): AvoidPreferences {
  return sanitizeAvoidPreferences({
    genres: preferences.flatMap((preference) => preference?.genres || []),
    terms: preferences.flatMap((preference) => preference?.terms || []),
  });
}

export function getUserAvoidPreferences(userId: string): AvoidPreferences {
  const row = db
    .prepare(
      `
        SELECT user_id, genres, terms, updated_at
        FROM user_avoid_preference
        WHERE user_id = ?
      `
    )
    .get(userId) as AvoidPreferenceRow | undefined;

  return row ? rowToPreferences(row) : { genres: [], terms: [] };
}

export function upsertUserAvoidPreferences(
  userId: string,
  preferences: AvoidPreferences
) {
  const sanitized = sanitizeAvoidPreferences(preferences);

  db.prepare(
    `
      INSERT INTO user_avoid_preference (
        user_id,
        genres,
        terms,
        updated_at
      )
      VALUES (
        @userId,
        @genres,
        @terms,
        datetime('now')
      )
      ON CONFLICT(user_id)
      DO UPDATE SET
        genres = excluded.genres,
        terms = excluded.terms,
        updated_at = datetime('now')
    `
  ).run({
    userId,
    genres: JSON.stringify(sanitized.genres),
    terms: JSON.stringify(sanitized.terms),
  });

  return getUserAvoidPreferences(userId);
}
