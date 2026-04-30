import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });

const databasePath =
  process.env.DATABASE_PATH || path.join(dataDir, "FlickBuddy.sqlite");

const globalForDb = globalThis as typeof globalThis & {
  FlickBuddyDb?: Database.Database;
};

export const db =
  globalForDb.FlickBuddyDb ||
  new Database(databasePath, {
    fileMustExist: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.FlickBuddyDb = db;
}

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function ensureAppTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS movie_snapshot (
      movie_id INTEGER PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS movie_interaction (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      movie_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      value INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, movie_id, action)
    );

    CREATE INDEX IF NOT EXISTS movie_interaction_user_idx
      ON movie_interaction(user_id);

    CREATE INDEX IF NOT EXISTS movie_interaction_action_idx
      ON movie_interaction(action);

    CREATE TABLE IF NOT EXISTS movie_list (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      is_public INTEGER NOT NULL DEFAULT 0,
      share_slug TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS movie_list_user_idx
      ON movie_list(user_id);

    CREATE UNIQUE INDEX IF NOT EXISTS movie_list_user_name_idx
      ON movie_list(user_id, name);

    CREATE UNIQUE INDEX IF NOT EXISTS movie_list_share_slug_idx
      ON movie_list(share_slug)
      WHERE share_slug IS NOT NULL;

    CREATE TABLE IF NOT EXISTS movie_list_item (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL,
      movie_id INTEGER NOT NULL,
      media_type TEXT NOT NULL DEFAULT 'movie',
      movie_data TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(list_id, movie_id, media_type),
      FOREIGN KEY(list_id) REFERENCES movie_list(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS movie_list_item_list_idx
      ON movie_list_item(list_id, position);

    CREATE TABLE IF NOT EXISTS user_taste_profile (
      user_id TEXT PRIMARY KEY,
      summary TEXT NOT NULL,
      liked_themes TEXT NOT NULL DEFAULT '[]',
      disliked_themes TEXT NOT NULL DEFAULT '[]',
      reference_titles TEXT NOT NULL DEFAULT '[]',
      recommended_queries TEXT NOT NULL DEFAULT '[]',
      genre_weights TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_entitlement (
      user_id TEXT PRIMARY KEY,
      plan TEXT NOT NULL DEFAULT 'beta',
      ai_daily_limit INTEGER,
      pro_expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS beta_usage (
      id TEXT PRIMARY KEY,
      identity_key TEXT NOT NULL,
      user_id TEXT,
      action TEXT NOT NULL,
      period_key TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      limit_count INTEGER NOT NULL,
      reset_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(identity_key, action, period_key)
    );

    CREATE INDEX IF NOT EXISTS beta_usage_identity_idx
      ON beta_usage(identity_key, action, period_key);

    CREATE TABLE IF NOT EXISTS analytics_event (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      anonymous_id TEXT,
      event_name TEXT NOT NULL,
      movie_id INTEGER,
      media_type TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS analytics_event_name_idx
      ON analytics_event(event_name, created_at);

    CREATE INDEX IF NOT EXISTS analytics_event_user_idx
      ON analytics_event(user_id, created_at);

    CREATE TABLE IF NOT EXISTS feedback_event (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      anonymous_id TEXT,
      movie_id INTEGER,
      media_type TEXT,
      feedback TEXT NOT NULL,
      source TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS feedback_event_feedback_idx
      ON feedback_event(feedback, created_at);
  `);
}
