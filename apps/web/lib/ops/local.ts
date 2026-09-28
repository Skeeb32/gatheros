import "server-only";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir, mkdir } from "node:fs/promises";
import path from "node:path";
export const DEMO_EVENT = "20000000-0000-4000-8000-000000000001";
export const DEMO_USER = "00000000-0000-4000-8000-000000000001";
const globalDb = globalThis as unknown as { gatherDb?: Promise<PGlite> };
export async function localDb() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL)
    throw new Error("Local adapter unavailable with Supabase");
  if (
    process.env.NODE_ENV === "production" &&
    process.env.GATHEROS_DEMO !== "true"
  )
    throw new Error(
      "Configure Supabase or explicitly enable GATHEROS_DEMO for a local preview",
    );
  if (!globalDb.gatherDb)
    globalDb.gatherDb = (async () => {
      const dir = path.resolve(process.env.GATHEROS_DATA_DIR || ".gatheros");
      await mkdir(dir, { recursive: true });
      const db = new PGlite(dir);
      const root = path.resolve("../../packages/database");
      const exists = await db.query<{ exists: boolean }>(
        "select exists(select 1 from information_schema.tables where table_name='event_documents')",
      );
      if (!exists.rows[0].exists)
        await db.transaction(async (tx) => {
          await tx.exec(
            await readFile(path.join(root, "tests/bootstrap.sql"), "utf8"),
          );
          for (const f of (await readdir(path.join(root, "migrations"))).sort())
            await tx.exec(
              (
                await readFile(path.join(root, "migrations", f), "utf8")
              ).replace("create extension if not exists pgcrypto;", ""),
            );
          await tx.exec(await readFile(path.join(root, "seed.sql"), "utf8"));
        });
      return db;
    })();
  return globalDb.gatherDb;
}
export async function localQuery<T>(sql: string, params: unknown[] = []) {
  const db = await localDb();
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      DEMO_USER,
    ]);
    return (await tx.query<T>(sql, params)).rows;
  });
}
