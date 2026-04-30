import posthog from "posthog-js";
import { Movie } from "@/types/movie";

type Metadata = Record<string, unknown>;

export function getClientId() {
  if (typeof window === "undefined") return "";

  const key = "flickbuddyClientId";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const created =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(key, created);
  return created;
}

function postJSON(path: string, body: Metadata) {
  if (typeof window === "undefined") return;

  void fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-flickbuddy-client-id": getClientId(),
    },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);
}

export function trackEvent(
  eventName: string,
  options: {
    movie?: Pick<Movie, "id" | "mediaType">;
    metadata?: Metadata;
  } = {}
) {
  postJSON("/api/analytics", {
    eventName,
    movieId: options.movie?.id,
    mediaType: options.movie?.mediaType === "tv" ? "tv" : "movie",
    metadata: options.metadata || {},
  });

  posthog.capture(eventName, {
    movie_id: options.movie?.id,
    media_type: options.movie?.mediaType === "tv" ? "tv" : "movie",
    ...options.metadata,
  });
}

export function sendFeedback({
  movie,
  feedback,
  source,
  metadata,
}: {
  movie: Pick<Movie, "id" | "mediaType">;
  feedback:
    | "good_pick"
    | "bad_pick"
    | "already_watched"
    | "not_available"
    | "too_obvious";
  source: string;
  metadata?: Metadata;
}) {
  postJSON("/api/feedback", {
    movieId: movie.id,
    mediaType: movie.mediaType === "tv" ? "tv" : "movie",
    feedback,
    source,
    metadata: metadata || {},
  });
}
