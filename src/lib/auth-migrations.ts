import { getMigrations } from "better-auth/db/migration";
import { auth } from "@/lib/auth";
import { ensureAppTables } from "@/lib/db";

let migrationPromise: Promise<void> | null = null;

export function ensureBackendReady() {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const { runMigrations } = await getMigrations(auth.options);
      await runMigrations();
      ensureAppTables();
    })();
  }

  return migrationPromise;
}
