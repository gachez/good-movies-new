import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { ensureBackendReady } from "@/lib/auth-migrations";

export const runtime = "nodejs";

const handler = toNextJsHandler(auth);

export async function GET(request: Request) {
  await ensureBackendReady();
  return handler.GET(request);
}

export async function POST(request: Request) {
  await ensureBackendReady();
  return handler.POST(request);
}
