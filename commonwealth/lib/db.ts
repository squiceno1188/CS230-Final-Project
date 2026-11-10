import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

// Next.js dev compiles route handlers and server components separately, so a
// module-level client would split into two empty databases. Keep one on globalThis.
const globalDb = globalThis as typeof globalThis & {
  __commonwealthPool?: pg.Pool;
  __commonwealthLocal?: Promise<PGlite>;
};

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  if (databaseUrl !== "") {
    globalDb.__commonwealthPool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await globalDb.__commonwealthPool.query(text, params)).rows as T[];
  }
  globalDb.__commonwealthLocal ??= startLocal().catch((error: unknown) => {
    globalDb.__commonwealthLocal = undefined;
    throw error;
  });
  return (await (await globalDb.__commonwealthLocal).query<T>(text, params)).rows;
}

async function startLocal(): Promise<PGlite> {
  const db = new PGlite();
  const files = (await readdir("migrations").catch(() => [])).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
  }
  return db;
}
