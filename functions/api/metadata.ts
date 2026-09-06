import { verify, getJwtSecret } from "./utils/authHelpers";
import { ensureSchema } from "./utils/schema";
import { parseMetadata } from "../../src/utils/parseMetadata";

interface Env {
  DB?: D1Database;
}

// --- SSRF protection ---
// Redirects are followed manually (max 3 hops) and every hop re-runs the host
// checks, so a public URL can no longer 302 into an internal address.
const MAX_REDIRECTS = 3;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata.google.internal",
]);

function isBlockedIPv4(parts: number[]): boolean {
  const [a, b, c] = parts;
  if (a === 0) return true; // "this network" incl. 0.0.0.0
  if (a === 10) return true; // RFC1918 private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 (cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918 private
  if (a === 192 && b === 168) return true; // RFC1918 private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // 192.0.0.0/24, TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking 198.18/15
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // multicast, reserved, broadcast
  return false;
}

function isBlockedIPv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (!h.includes(":")) return false;
  if (h === "::" || h === "::1") return true;

  // Embedded IPv4 (e.g. ::ffff:127.0.0.1) — validate the v4 part.
  const v4 = h.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4) {
    const parts = v4[1].split(".").map(Number);
    if (parts.length === 4 && parts.every((n) => n <= 255)) return isBlockedIPv4(parts);
  }

  // Loopback written longhand (0:0:...:1)
  const groups = h.split(":").filter((g) => g !== "");
  if (
    groups.length > 0 &&
    groups[groups.length - 1] === "1" &&
    groups.every((g) => /^0{1,4}$/.test(g) || g === "1")
  ) {
    return true;
  }

  if (/^f[cd]/.test(h)) return true; // fc00::/7 unique-local
  if (/^fe[89ab]/.test(h)) return true; // fe80::/10 link-local
  return false;
}

// inet_aton shorthand: "127.1" → 127.0.0.1, "10.513" → 10.0.2.1. All labels
// before the last take one byte; the last fills the remaining bytes.
function expandDecimalHost(host: string): number[] | null {
  const labels = host.split(".").map(Number);
  const n = labels.length;
  if (n > 4 || labels.some((v) => !Number.isInteger(v))) return null;
  if (labels.slice(0, -1).some((v) => v > 255)) return null;
  const remaining = 5 - n;
  const last = labels[n - 1];
  if (last > 2 ** (8 * remaining) - 1) return null;
  const bytes = labels.slice(0, -1);
  for (let i = remaining - 1; i >= 0; i--) {
    bytes.push((last >> (8 * i)) & 255);
  }
  return bytes;
}

function isBlockedHost(rawHostname: string): boolean {
  const host = rawHostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  // Hex IP encoding ("0x7f.1") — never a real domain name.
  if (/(^|\.)0x/i.test(host)) return true;

  const bare = host.replace(/^\[|\]$/g, "");
  if (bare.includes(":")) return isBlockedIPv6(bare);

  if (/^\d+(\.\d+)*$/.test(bare)) {
    // Leading-zero labels are octal IP encodings ("0177.0.0.1" = 127.0.0.1)
    // and never occur in real domain names.
    if (/(^|\.)0\d/.test(bare)) return true;
    const parts = expandDecimalHost(bare);
    if (parts && parts.length === 4) return isBlockedIPv4(parts);
  }
  return false;
}

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

    let currentUrl = targetUrl;
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
