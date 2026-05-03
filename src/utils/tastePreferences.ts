export interface AvoidPreferences {
  genres: string[];
  terms: string[];
  updatedAt?: string;
}

export const AVOID_PREFERENCES_STORAGE_KEY = "flickbuddyAvoidPreferencesV1";

export const avoidGenreOptions = [
  "Action",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "Horror",
  "Mystery",
  "Reality",
  "Romance",
  "Science Fiction",
  "Thriller",
];

function normalizeList(values: unknown, maxItems: number, maxLength: number) {
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

export function sanitizeAvoidPreferences(value: unknown): AvoidPreferences {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    genres: normalizeList(record.genres, 24, 48),
    terms: normalizeList(record.terms, 40, 90),
    updatedAt:
      typeof record.updatedAt === "string" ? record.updatedAt : undefined,
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

export function readAvoidPreferences(): AvoidPreferences {
  if (typeof window === "undefined") return { genres: [], terms: [] };

  const raw = window.localStorage.getItem(AVOID_PREFERENCES_STORAGE_KEY);
  if (!raw) return { genres: [], terms: [] };

  try {
    return sanitizeAvoidPreferences(JSON.parse(raw));
  } catch {
    return { genres: [], terms: [] };
  }
}

export function saveAvoidPreferences(preferences: AvoidPreferences) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    AVOID_PREFERENCES_STORAGE_KEY,
    JSON.stringify({
      ...sanitizeAvoidPreferences(preferences),
      updatedAt: new Date().toISOString(),
    })
  );
}

export function addAvoidPreferences(
  current: AvoidPreferences,
  additions: Partial<AvoidPreferences> | null | undefined
) {
  return mergeAvoidPreferences(current, additions);
}

export function appendAvoidQueryParams(
  params: URLSearchParams,
  preferences = readAvoidPreferences()
) {
  preferences.genres.forEach((genre) => params.append("avoidGenre", genre));
  preferences.terms.forEach((term) => params.append("avoidTerm", term));
}
