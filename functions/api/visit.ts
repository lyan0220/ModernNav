import { ensureSchema } from "./utils/schema";

interface Env {
  DB?: D1Database;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    if (!env.DB) return new Response(null, { status: 204 });

    await ensureSchema(env.DB);

    const body = (await request.json()) as { linkId?: string };
    if (!body?.linkId || typeof body.linkId !== "string") {
      return new Response(null, { status: 204 });
    }

    await env.DB.prepare("UPDATE links SET visit_count = visit_count + 1 WHERE id = ?")
      .bind(body.linkId)
      .run();

    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
};
