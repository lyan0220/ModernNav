interface Env {
  DB?: D1Database;
}

// Deliberately minimal: exposes only aggregate health, never error details,
// heap stats, or log contents (this endpoint is unauthenticated).
export const onRequestGet = async ({ env }: { env: Env }) => {
  const startTime = Date.now();

  let database: "healthy" | "unavailable" | "unhealthy" = "unavailable";
  if (env.DB) {
    try {
      await env.DB.prepare("SELECT 1").first();
      database = "healthy";
    } catch {
      database = "unhealthy";
    }
  }

  return new Response(
    JSON.stringify({
      status: database === "healthy" ? "healthy" : "degraded",
      database,
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime,
    }),
    {
      status: database === "healthy" ? 200 : 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
};
