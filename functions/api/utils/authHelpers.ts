// 认证相关的工具函数

const ACCESS_TTL = 60 * 60 * 1000; // 60分钟
const REFRESH_TTL = 7 * 24 * 60 * 60 * 1000; // 7天

// 错误消息
const ERROR_MESSAGES = {
  INVALID_TOKEN: "Invalid or expired token",
  UNAUTHORIZED: "Unauthorized access",
  RATE_LIMITED: "Too many requests, please try again later",
  INVALID_CREDENTIALS: "Invalid credentials",
  SERVER_ERROR: "Server error, please try again later",
  INVALID_DATA: "Invalid data format",
  DATA_NOT_FOUND: "Requested data not found",
  CONFLICT: "Data was modified by another session, please reload",
};

// 加密助手
export async function sign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Constant-time comparison so token signatures and auth codes can't be
// recovered byte-by-byte from response timing.
export function timingSafeEqual(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < Math.max(ab.length, bb.length); i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

export async function verify(
  token: string,
  secret: string,
  expectedType?: "access" | "refresh"
): Promise<boolean> {
  try {
    const [payloadB64, signatureB64] = token.split(".");
    if (!payloadB64 || !signatureB64) return false;
    const expectedSignature = await sign(payloadB64, secret);
    if (!timingSafeEqual(signatureB64, expectedSignature)) return false;
    const payload = JSON.parse(atob(payloadB64));
    if (expectedType && payload.type !== expectedType) return false;
    return Date.now() < payload.exp;
  } catch {
    return false;
  }
}

export async function generateToken(type: "access" | "refresh", secret: string): Promise<string> {
  const payload = btoa(
    JSON.stringify({
      exp: Date.now() + (type === "access" ? ACCESS_TTL : REFRESH_TTL),
      type,
    })
  );
  return payload + "." + (await sign(payload, secret));
}

// --- Auth code storage (PBKDF2-hashed) ---

const PBKDF2_ITERATIONS = 100_000;
const CODE_HASH_PREFIX = "pbkdf2";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function deriveCodeHash(code: string, salt: Uint8Array, iterations: number): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(code),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    keyMaterial,
    256
  );
  return toHex(new Uint8Array(bits));
}

export async function hashCode(code: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveCodeHash(code, salt, PBKDF2_ITERATIONS);
  return `${CODE_HASH_PREFIX}$${PBKDF2_ITERATIONS}$${toHex(salt)}$${hash}`;
}

export function isHashedCode(stored: string): boolean {
  return stored.startsWith(`${CODE_HASH_PREFIX}$`);
}

// Accepts both hashed storage and legacy plaintext values. Callers migrate
// plaintext custom codes to a hash after a successful login; the "admin"
// default stays plaintext so default-code detection keeps working.
export async function verifyCode(code: string, stored: string): Promise<boolean> {
  if (isHashedCode(stored)) {
    const [, iterationsStr, saltHex, hashHex] = stored.split("$");
    const iterations = parseInt(iterationsStr, 10);
    if (!iterations || !saltHex || !hashHex) return false;
    const hash = await deriveCodeHash(code, fromHex(saltHex), iterations);
    return timingSafeEqual(hash, hashHex);
  }
  return timingSafeEqual(code, stored);
}

// --- JWT signing secret ---

// Used only when no D1 binding exists; no protected endpoint accepts tokens in
// that mode, so the static value is harmless.
export const LOCAL_FALLBACK_SECRET = "modernnav-local-mode";

function randomSecret(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// The auth code is user-chosen (potentially low entropy) and must not double
// as the HMAC key, so tokens are signed with an independent random secret.
export async function getJwtSecret(db: D1Database): Promise<string> {
  const row = await db
    .prepare("SELECT value FROM config WHERE key = 'jwt_secret'")
    .first<{ value: string }>();
  if (row?.value) return row.value;
  return await rotateJwtSecret(db);
}

// Regenerates the signing secret, invalidating every previously issued token.
export async function rotateJwtSecret(db: D1Database): Promise<string> {
  const secret = randomSecret();
  await db
    .prepare(
      "INSERT INTO config (key, value) VALUES ('jwt_secret', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind(secret)
    .run();
  return secret;
}

// Cookie 助手
export function respondWithCookie(body: unknown, token: string, clear = false, status = 200) {
  const cookie =
    "refresh_token=" +
    (clear ? "" : token) +
    "; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=" +
    (clear ? 0 : REFRESH_TTL / 1000);

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookie,
      // 增加安全头
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    },
  });
}

// D1-backed per-IP rate limiter. The previous in-process Map was reset on every
// cold start and not shared between isolates, so an attacker hitting different
// POPs effectively had no limit. The UPSERT + RETURNING runs in a single round
// trip and resets the window in-place when it has expired.
//
// Fail-open behavior on missing env.DB matches the pre-D1 effective state
// (in-process Map was already useless across isolates); a one-time console
// warning surfaces the misconfiguration without spamming logs.
export class RateLimiter {
  private static warned = false;

  constructor(
    private scope: string,
    private maxRequests: number,
    private windowMs: number
  ) {}

  async isAllowed(db: D1Database | undefined, identifier: string): Promise<boolean> {
    if (!db) {
      this.warnOnce();
      return true;
    }
    const now = Date.now();
    const newEnd = now + this.windowMs;
    const row = await db
      .prepare(
        `INSERT INTO rate_limits (identifier, scope, window_end, count)
         VALUES (?1, ?2, ?3, 1)
         ON CONFLICT(identifier, scope) DO UPDATE SET
           count = CASE WHEN window_end < ?4 THEN 1 ELSE count + 1 END,
           window_end = CASE WHEN window_end < ?4 THEN ?3 ELSE window_end END
         RETURNING count, window_end`
      )
      .bind(identifier, this.scope, newEnd, now)
      .first<{ count: number; window_end: number }>();
    return (row?.count ?? 0) <= this.maxRequests;
  }

  async getResetTime(db: D1Database | undefined, identifier: string): Promise<number> {
    if (!db) return Date.now() + this.windowMs;
    const row = await db
      .prepare("SELECT window_end FROM rate_limits WHERE identifier = ?1 AND scope = ?2")
      .bind(identifier, this.scope)
      .first<{ window_end: number }>();
    return row?.window_end ?? Date.now() + this.windowMs;
  }

  private warnOnce() {
    if (RateLimiter.warned) return;
    RateLimiter.warned = true;
    console.warn("[RateLimiter] env.DB unavailable — failing open. Rate limiting disabled.");
  }
}

// 获取客户端IP助手
export function getClientIP(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown"
  );
}

export { ACCESS_TTL, REFRESH_TTL, ERROR_MESSAGES };
