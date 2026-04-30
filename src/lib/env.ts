import "server-only";

const DEV_AUTH_SECRET = "development-only-better-auth-secret-change-before-production";

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value && isProduction()) {
    throw new Error(`${name} must be configured in production.`);
  }

  return value || "";
}

export function getAuthSecret() {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();

  if (!secret && isProduction()) {
    throw new Error("BETTER_AUTH_SECRET must be configured in production.");
  }

  return secret || DEV_AUTH_SECRET;
}

export function getAppBaseUrl() {
  return process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
