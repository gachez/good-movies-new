import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ensureBackendReady } from "@/lib/auth-migrations";

function parseAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function getConfiguredAdminEmails() {
  return Array.from(parseAdminEmails());
}

export async function getAdminSession() {
  await ensureBackendReady();

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const email = session?.user.email?.trim().toLowerCase();
  const adminEmails = parseAdminEmails();

  if (!session || !email || !adminEmails.has(email)) {
    return null;
  }

  return session;
}
