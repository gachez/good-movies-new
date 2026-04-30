import "server-only";

import { createHash } from "node:crypto";
import { NextRequest } from "next/server";

const ANONYMOUS_ID_PATTERN = /^[a-zA-Z0-9_-]{12,80}$/;

export function getAnonymousId(request: NextRequest) {
  const headerValue = request.headers.get("x-flickbuddy-client-id")?.trim();
  return headerValue && ANONYMOUS_ID_PATTERN.test(headerValue) ? headerValue : null;
}

export function getRequestIpHash(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwardedFor || realIp || "unknown";

  return createHash("sha256")
    .update(`${ip}:${process.env.BETTER_AUTH_SECRET || "dev"}`)
    .digest("hex")
    .slice(0, 32);
}

export function getUsageIdentity(request: NextRequest, userId?: string | null) {
  if (userId) {
    return {
      anonymousId: getAnonymousId(request),
      identityKey: `user:${userId}`,
    };
  }

  const anonymousId = getAnonymousId(request);
  return {
    anonymousId,
    identityKey: anonymousId
      ? `anon:${anonymousId}`
      : `ip:${getRequestIpHash(request)}`,
  };
}
