import { ensureSchema } from "./utils/schema";
import { RateLimiter, getClientIP, ERROR_MESSAGES } from "./utils/authHelpers";

interface Env {
  DB?: D1Database;
}

// Per-IP cap so visit counts can't be inflated arbitrarily.
const visitRateLimiter = new RateLimiter("visit", 60, 60 * 1000);

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    if (!env.DB) return new Response(null, { status: 204 });

    await ensureSchema(env.DB);

    if (!(await visitRateLimiter.isAllowed(env.DB, getClientIP(request)))) {
      return new Response(JSON.stringify({ error: ERROR_MESSAGES.RATE_LIMITED }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = (await request.json()) as { linkId?: string };
    if (!body?.linkId || typeof body.linkId !== "string" || body.linkId.length > 64) {
      return new Response(null, { status: 204 });
    }

    // UPDATE only matches an existing row, so unknown ids are a harmless no-op.
    await env.DB.prepare("UPDATE links SET visit_count = visit_count + 1 WHERE id = ?")
      .bind(body.linkId)
      .run();

    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
};
