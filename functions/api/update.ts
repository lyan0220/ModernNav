interface Env {
  DB?: D1Database;
}

import { verify, getClientIP, RateLimiter, ERROR_MESSAGES, getJwtSecret } from "./utils/authHelpers";
import { ensureSchema } from "./utils/schema";
import { readAllCategories, getDataVersion } from "./utils/reads";
import { diffCategories, applyCategoryDiff } from "./utils/diff";
import { UpdatePayload, Category } from "../../src/types";
import { validateFullCategory, validatePreferences, validateBackground } from "./utils/validation";

const updateRateLimiter = new RateLimiter("data_update", 20, 60 * 1000);

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const clientIP = getClientIP(request);

    if (env.DB) await ensureSchema(env.DB);

    if (!(await updateRateLimiter.isAllowed(env.DB, clientIP))) {
      return jsonError(ERROR_MESSAGES.RATE_LIMITED, 429);
    }

    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) return jsonError(ERROR_MESSAGES.UNAUTHORIZED, 401);
    if (!env.DB) return jsonError("Database not available", 503);

    const jwtSecret = await getJwtSecret(env.DB);
    if (!(await verify(token, jwtSecret, "access"))) {
      return jsonError(ERROR_MESSAGES.UNAUTHORIZED, 401);
    }

    const body = (await request.json()) as UpdatePayload;
    if (!body || typeof body !== "object" || !body.type) {
      return jsonError(ERROR_MESSAGES.INVALID_DATA, 400);
    }

    const { type, data } = body;
    if (data === undefined || data === null) {
      return jsonError(ERROR_MESSAGES.INVALID_DATA, 400);
    }

    const allowedTypes = ["categories", "background", "prefs"];
    if (!allowedTypes.includes(type)) {
      return jsonError(ERROR_MESSAGES.INVALID_DATA, 400);
    }

    // Optimistic-concurrency guard: clients send the dataVersion they based
    // their edit on; a mismatch means another device wrote in between.
    // Old clients that don't send a version skip the check (backward compat).
    const expectedVersion = typeof body.version === "number" ? body.version : undefined;

    // --- Categories: diff-based write ---
    // Read current state, compute a minimal diff, and apply only the changed
    // rows in one D1 batch. A single rename used to wipe + rewrite the whole
    // tree (hundreds of rows); now it emits one UPDATE.
    if (type === "categories") {
      if (!Array.isArray(data)) return jsonError("Categories must be an array", 400);
      if (data.length > 50) return jsonError("Too many categories (max 50)", 400);

      for (const cat of data) {
        const v = validateFullCategory(cat);
        if (!v.valid) return jsonError(v.message || ERROR_MESSAGES.INVALID_DATA, 400);
      }

      const current = await readAllCategories(env.DB);
      const diff = diffCategories(current, data as Category[]);
      await applyCategoryDiff(env.DB, diff);
      return await finishWrite(env.DB, expectedVersion);
    }

    // --- Background: KV ---
    if (type === "background") {
      const v = validateBackground(data);
      if (!v.valid) return jsonError(v.message || ERROR_MESSAGES.INVALID_DATA, 400);
      const value = typeof data === "string" ? data : JSON.stringify(data);
      await upsertConfig(env.DB, "background", value);
      return await finishWrite(env.DB, expectedVersion);
    }

    // --- Prefs: KV (JSON) ---
    if (type === "prefs") {
      const v = validatePreferences(data);
      if (!v.valid) return jsonError(v.message || ERROR_MESSAGES.INVALID_DATA, 400);
      const value = typeof data === "string" ? data : JSON.stringify(data);
      if (value.length > 10_000) return jsonError("Preferences too large (max 10KB)", 400);
      await upsertConfig(env.DB, "prefs", value);
      return await finishWrite(env.DB, expectedVersion);
    }

    return jsonError(ERROR_MESSAGES.INVALID_DATA, 400);
  } catch (error) {
    console.error("Update API Error:", error);
    return jsonError(ERROR_MESSAGES.SERVER_ERROR, 500);
  }
};

// Atomically verifies the client's version (when provided) and increments the
// counter. A failed conditional bump means a concurrent write happened.
async function finishWrite(db: D1Database, expectedVersion?: number): Promise<Response> {
  const newVersion = await bumpDataVersion(db, expectedVersion);
  if (newVersion === null) {
    return jsonError(ERROR_MESSAGES.CONFLICT, 409, { currentVersion: await getDataVersion(db) });
  }
  return jsonOk(newVersion);
}

async function bumpDataVersion(db: D1Database, expected?: number): Promise<number | null> {
  if (expected === undefined) {
    const row = await db
      .prepare(
        `INSERT INTO config (key, value) VALUES ('data_version', '1')
         ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(config.value AS INTEGER) + 1 AS TEXT)
         RETURNING value`
      )
      .first<{ value: string }>();
    return row ? parseInt(row.value, 10) : 1;
  }

  const row = await db
    .prepare(
      `INSERT INTO config (key, value) VALUES ('data_version', CAST(?1 AS TEXT))
       ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(config.value AS INTEGER) + 1 AS TEXT)
       WHERE CAST(config.value AS INTEGER) = ?2
       RETURNING value`
    )
    .bind(String(expected + 1), expected)
    .first<{ value: string }>();
  return row ? parseInt(row.value, 10) : null;
}

async function upsertConfig(db: D1Database, key: string, value: string) {
  await db
    .prepare(
      "INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind(key, value)
    .run();
}

function jsonOk(dataVersion?: number) {
  return new Response(
    JSON.stringify(dataVersion !== undefined ? { success: true, dataVersion } : { success: true }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}

function jsonError(message: string, status: number, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
