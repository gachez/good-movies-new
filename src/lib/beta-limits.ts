import "server-only";

import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { db, ensureAppTables } from "@/lib/db";
import { getUsageIdentity } from "@/lib/request-identity";

export type BetaLimitedAction =
  | "ai_discover"
  | "feed_story_rerank"
  | "ai_profile_refresh"
  | "legacy_recommendations";

interface UsageRow {
  count: number;
  limit_count: number;
  reset_at: string;
}

interface BetaLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
}

const DEFAULT_LIMITS: Record<
  BetaLimitedAction,
  {
    anonymous: number;
    authenticated: number;
  }
> = {
  ai_discover: { anonymous: 1, authenticated: 80 },
  feed_story_rerank: { anonymous: 12, authenticated: 60 },
  ai_profile_refresh: { anonymous: 0, authenticated: 6 },
  legacy_recommendations: { anonymous: 10, authenticated: 40 },
};

ensureAppTables();

function envLimit(action: BetaLimitedAction, authed: boolean) {
  const prefix = authed ? "AUTHENTICATED" : "ANONYMOUS";
  const key = `BETA_${prefix}_${action.toUpperCase()}_DAILY_LIMIT`;
  const parsed = Number(process.env[key]);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function getDailyLimit(action: BetaLimitedAction, userId?: string | null) {
  const authed = Boolean(userId);
  return (
    envLimit(action, authed) ??
    DEFAULT_LIMITS[action][authed ? "authenticated" : "anonymous"]
  );
}

function getUtcPeriod() {
  const now = new Date();
  const periodKey = now.toISOString().slice(0, 10);
  const reset = new Date(now);
  reset.setUTCHours(24, 0, 0, 0);

  return {
    periodKey,
    resetAt: reset.toISOString(),
  };
}

export function betaLimitHeaders(result: BetaLimitResult) {
  return {
    "X-Beta-Limit": String(result.limit),
    "X-Beta-Limit-Remaining": String(result.remaining),
    "X-Beta-Limit-Reset": result.resetAt,
  };
}

export function consumeBetaLimit({
  request,
  userId,
  action,
}: {
  request: NextRequest;
  userId?: string | null;
  action: BetaLimitedAction;
}): BetaLimitResult {
  const limit = getDailyLimit(action, userId);
  const { identityKey } = getUsageIdentity(request, userId);
  const { periodKey, resetAt } = getUtcPeriod();

  if (limit <= 0) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt,
    };
  }

  const result = db.transaction(() => {
    const existing = db
      .prepare(
        `
          SELECT count, limit_count, reset_at
          FROM beta_usage
          WHERE identity_key = ? AND action = ? AND period_key = ?
        `
      )
      .get(identityKey, action, periodKey) as UsageRow | undefined;

    if (existing) {
      if (existing.count >= limit) {
        return {
          allowed: false,
          limit,
          remaining: 0,
          resetAt: existing.reset_at,
        };
      }

      const nextCount = existing.count + 1;
      db.prepare(
        `
          UPDATE beta_usage
          SET count = ?, limit_count = ?, reset_at = ?, updated_at = datetime('now')
          WHERE identity_key = ? AND action = ? AND period_key = ?
        `
      ).run(nextCount, limit, resetAt, identityKey, action, periodKey);

      return {
        allowed: true,
        limit,
        remaining: Math.max(limit - nextCount, 0),
        resetAt,
      };
    }

    db.prepare(
      `
        INSERT INTO beta_usage (
          id,
          identity_key,
          user_id,
          action,
          period_key,
          count,
          limit_count,
          reset_at,
          created_at,
          updated_at
        )
        VALUES (
          @id,
          @identityKey,
          @userId,
          @action,
          @periodKey,
          1,
          @limit,
          @resetAt,
          datetime('now'),
          datetime('now')
        )
      `
    ).run({
      id: randomUUID(),
      identityKey,
      userId: userId || null,
      action,
      periodKey,
      limit,
      resetAt,
    });

    return {
      allowed: true,
      limit,
      remaining: Math.max(limit - 1, 0),
      resetAt,
    };
  })();

  return result;
}
