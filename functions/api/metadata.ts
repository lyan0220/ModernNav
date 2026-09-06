import { verify, getJwtSecret } from "./utils/authHelpers";
import { ensureSchema } from "./utils/schema";
import { isBlockedHost } from "./utils/ssrf";
import { parseMetadata } from "../../src/utils/parseMetadata";

interface Env {
  DB?: D1Database;
}

// --- SSRF protection ---
// Redirects are followed manually (max 3 hops) and every hop re-runs the host
// checks, so a public URL can no longer 302 into an internal address.
// The host rules themselves live in utils/ssrf.ts (unit-tested there).
const MAX_REDIRECTS = 3;

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token || !env.DB) return jsonError("Unauthorized", 401);
    await ensureSchema(env.DB);

    const jwtSecret = await getJwtSecret(env.DB);
    if (!(await verify(token, jwtSecret, "access"))) {
      return jsonError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("url");
    if (!targetUrl) return jsonError("Missing url parameter", 400);

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return jsonError("Invalid URL", 400);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // The pre-parsed URL is the first hop; every redirect target re-enters
    // the same validation loop below.
    let currentUrl = parsed.toString();
    let response: Response | null = null;
    try {
      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const hopUrl = new URL(currentUrl);
        if (hopUrl.protocol !== "http:" && hopUrl.protocol !== "https:") {
          return jsonError("Invalid URL", 400);
        }
        if (isBlockedHost(hopUrl.hostname)) return jsonError("Invalid URL", 400);

        const hopResponse = await fetch(hopUrl.toString(), {
          signal: controller.signal,
          headers: { "User-Agent": "ModernNav/1.0" },
          redirect: "manual",
        });

        if (hopResponse.status >= 300 && hopResponse.status < 400) {
          const location = hopResponse.headers.get("location");
          hopResponse.body?.cancel();
          if (!location) return jsonError("Fetch failed", 502);
          currentUrl = new URL(location, hopUrl).toString();
          continue;
        }
        response = hopResponse;
        break;
      }
      if (!response) return jsonError("Too many redirects", 508);
    } catch {
      return jsonError("Fetch failed", 502);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) return jsonError("Fetch failed", 502);

    const reader = response.body?.getReader();
    if (!reader) return jsonError("Fetch failed", 502);

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    const MAX_BYTES = 16 * 1024;

    while (totalBytes < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalBytes += value.length;
    }
    reader.cancel();

    const decoder = new TextDecoder();
    const html = decoder.decode(mergeChunks(chunks, Math.min(totalBytes, MAX_BYTES)));

    const metadata = parseMetadata(html, currentUrl);

    return new Response(JSON.stringify(metadata), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return jsonError("Fetch failed", 502);
  }
};

function mergeChunks(chunks: Uint8Array[], totalLength: number): Uint8Array {
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    const toCopy = Math.min(chunk.length, totalLength - offset);
    result.set(chunk.subarray(0, toCopy), offset);
    offset += toCopy;
    if (offset >= totalLength) break;
  }
  return result;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
