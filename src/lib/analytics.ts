import "server-only";

import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { db, ensureAppTables } from "@/lib/db";
import { getUsageIdentity } from "@/lib/request-identity";

type Metadata = Record<string, unknown>;

const EVENT_PATTERN = /^[a-z0-9_.:-]{2,80}$/;
const FEEDBACK_VALUES = new Set([
  "good_pick",
  "bad_pick",
  "already_watched",
  "not_available",
  "too_obvious",
]);

ensureAppTables();

function normalizeEventName(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return EVENT_PATTERN.test(normalized) ? normalized : null;
}

function normalizeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "{}";
  const json = JSON.stringify(value as Metadata);
  return json.length > 4000 ? json.slice(0, 4000) : json;
}

function normalizeMediaType(value: unknown) {
  return value === "tv" ? "tv" : value === "movie" ? "movie" : null;
}

function normalizeMovieId(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function recordAnalyticsEvent({
  request,
  userId,
  eventName,
  movieId,
  mediaType,
  metadata,
}: {
  request: NextRequest;
  userId?: string | null;
  eventName: unknown;
  movieId?: unknown;
  mediaType?: unknown;
  metadata?: unknown;
}) {
  const normalizedEventName = normalizeEventName(eventName);
  if (!normalizedEventName) return false;

  const { anonymousId } = getUsageIdentity(request, userId);

  db.prepare(
    `
      INSERT INTO analytics_event (
        id,
        user_id,
        anonymous_id,
        event_name,
        movie_id,
        media_type,
        metadata,
        created_at
      )
      VALUES (
        @id,
        @userId,
        @anonymousId,
        @eventName,
        @movieId,
        @mediaType,
        @metadata,
        datetime('now')
      )
    `
  ).run({
    id: randomUUID(),
    userId: userId || null,
    anonymousId,
    eventName: normalizedEventName,
    movieId: normalizeMovieId(movieId),
    mediaType: normalizeMediaType(mediaType),
    metadata: normalizeMetadata(metadata),
  });

  return true;
}

export function recordFeedbackEvent({
  request,
  userId,
  movieId,
  mediaType,
  feedback,
  source,
  note,
  metadata,
}: {
  request: NextRequest;
  userId?: string | null;
  movieId?: unknown;
  mediaType?: unknown;
  feedback?: unknown;
  source?: unknown;
  note?: unknown;
  metadata?: unknown;
}) {
  const normalizedFeedback =
    typeof feedback === "string" && FEEDBACK_VALUES.has(feedback)
      ? feedback
      : null;
  if (!normalizedFeedback) return false;

  const { anonymousId } = getUsageIdentity(request, userId);
  const normalizedSource =
    typeof source === "string" ? source.trim().slice(0, 80) : "unknown";
  const normalizedNote =
    typeof note === "string" ? note.trim().slice(0, 500) : "";

  db.prepare(
    `
      INSERT INTO feedback_event (
        id,
        user_id,
        anonymous_id,
        movie_id,
        media_type,
        feedback,
        source,
        note,
        metadata,
        created_at
      )
      VALUES (
        @id,
        @userId,
        @anonymousId,
        @movieId,
        @mediaType,
        @feedback,
        @source,
        @note,
        @metadata,
        datetime('now')
      )
    `
  ).run({
    id: randomUUID(),
    userId: userId || null,
    anonymousId,
    movieId: normalizeMovieId(movieId),
    mediaType: normalizeMediaType(mediaType),
    feedback: normalizedFeedback,
    source: normalizedSource,
    note: normalizedNote,
    metadata: normalizeMetadata(metadata),
  });

  return true;
}
