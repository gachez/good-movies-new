import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { ensureBackendReady } from "@/lib/auth-migrations";

export async function getRequestSession(request: NextRequest) {
  await ensureBackendReady();
  return auth.api.getSession({
    headers: request.headers,
  });
}
