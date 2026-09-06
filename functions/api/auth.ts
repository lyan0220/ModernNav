interface Env {
  DB?: D1Database;
}

import {
  verify,
  generateToken,
  respondWithCookie,
  RateLimiter,
  getClientIP,
  ERROR_MESSAGES,
  verifyCode,
  hashCode,
  isHashedCode,
  getJwtSecret,
  rotateJwtSecret,
  LOCAL_FALLBACK_SECRET,
} from "./utils/authHelpers";
import { ensureSchema } from "./utils/schema";

// 创建速率限制器实例 - 为不同操作设置独立的限制
const loginRateLimiter = new RateLimiter("auth_login", 10, 15 * 60 * 1000); // 登录：15分钟内最多10次
const refreshRateLimiter = new RateLimiter("auth_refresh", 100, 15 * 60 * 1000); // 刷新token：15分钟内最多100次
const updateRateLimiter = new RateLimiter("auth_update", 10, 15 * 60 * 1000); // 修改密码：15分钟内最多10次

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const clientIP = getClientIP(request);

    if (env.DB) await ensureSchema(env.DB);

    const body = (await request.json()) as Record<string, unknown>;
    const { action, code, currentCode, newCode } = body as {
      action?: string;
      code?: string;
      currentCode?: string;
      newCode?: string;
    };

    // 输入验证
    if (!action || typeof action !== "string") {
      return new Response(JSON.stringify({ error: ERROR_MESSAGES.INVALID_DATA }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 统一解析 storedCode：有 DB 则查表，无 DB 则用默认值
    let storedCode = "admin";
    if (env.DB) {
      const codeRow = await env.DB.prepare(
        "SELECT value FROM config WHERE key = 'auth_code'"
      ).first<{
        value: string;
      }>();
      storedCode = codeRow?.value || "admin";
    }
    const jwtSecret = env.DB ? await getJwtSecret(env.DB) : LOCAL_FALLBACK_SECRET;

    // 1. 登录
    if (action === "login") {
      if (!(await loginRateLimiter.isAllowed(env.DB, clientIP))) {
        const resetTime = await loginRateLimiter.getResetTime(env.DB, clientIP);
        return new Response(
          JSON.stringify({
            error: ERROR_MESSAGES.RATE_LIMITED,
            resetTime,
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (!code || typeof code !== "string") {
        return new Response(JSON.stringify({ error: ERROR_MESSAGES.INVALID_CREDENTIALS }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!(await verifyCode(code, storedCode))) {
        return new Response(JSON.stringify({ error: ERROR_MESSAGES.INVALID_CREDENTIALS }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Migrate legacy plaintext custom codes to a hash. The "admin" default
      // stays plaintext so default-code detection (isDefaultCode) keeps working.
      if (env.DB && storedCode !== "admin" && !isHashedCode(storedCode)) {
        await env.DB.prepare(
          "INSERT INTO config (key, value) VALUES ('auth_code', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
        )
          .bind(await hashCode(code))
          .run();
      }

      return respondWithCookie(
        {
          success: true,
          accessToken: await generateToken("access", jwtSecret),
        },
        await generateToken("refresh", jwtSecret)
      );
    }

    // 2. 刷新 Token
    if (action === "refresh") {
      if (!(await refreshRateLimiter.isAllowed(env.DB, clientIP))) {
        const resetTime = await refreshRateLimiter.getResetTime(env.DB, clientIP);
        return new Response(
          JSON.stringify({
            error: ERROR_MESSAGES.RATE_LIMITED,
            resetTime,
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const rfToken = request.headers.get("Cookie")?.match(/refresh_token=([^;]+)/)?.[1];

      if (!rfToken) {
        return respondWithCookie({ error: ERROR_MESSAGES.INVALID_TOKEN }, "", true, 401);
      }

      try {
        const isValid = await verify(rfToken, jwtSecret, "refresh");
        if (!isValid) {
          return respondWithCookie({ error: ERROR_MESSAGES.INVALID_TOKEN }, "", true, 401);
        }
      } catch (error) {
        console.error("Token verification error during refresh:", error);
        return respondWithCookie({ error: ERROR_MESSAGES.INVALID_TOKEN }, "", true, 401);
      }

      return respondWithCookie(
        {
          success: true,
          accessToken: await generateToken("access", jwtSecret),
        },
        await generateToken("refresh", jwtSecret)
      );
    }

    // 3. 修改密码（需要 DB）
    if (action === "update") {
      if (!env.DB) {
        return new Response(
          JSON.stringify({ error: "Database not available for password update" }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (!(await updateRateLimiter.isAllowed(env.DB, clientIP))) {
        const resetTime = await updateRateLimiter.getResetTime(env.DB, clientIP);
        return new Response(
          JSON.stringify({
            error: ERROR_MESSAGES.RATE_LIMITED,
            resetTime,
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const token = request.headers.get("Authorization")?.split(" ")[1];

      if (!token) {
        return new Response(JSON.stringify({ error: ERROR_MESSAGES.UNAUTHORIZED }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!(await verify(token, jwtSecret, "access"))) {
        return new Response(JSON.stringify({ error: ERROR_MESSAGES.UNAUTHORIZED }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (
        !currentCode ||
        !newCode ||
        typeof currentCode !== "string" ||
        typeof newCode !== "string"
      ) {
        return new Response(JSON.stringify({ error: ERROR_MESSAGES.INVALID_DATA }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!(await verifyCode(currentCode, storedCode))) {
        return new Response(JSON.stringify({ error: ERROR_MESSAGES.INVALID_CREDENTIALS }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (newCode.length < 8) {
        return new Response(
          JSON.stringify({
            error: "New code must be at least 8 characters long",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Store the new code hashed and rotate the signing secret so tokens
      // issued under the old code (other devices/sessions) become invalid.
      await env.DB.prepare(
        "INSERT INTO config (key, value) VALUES ('auth_code', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      )
        .bind(await hashCode(newCode))
        .run();

      const newSecret = await rotateJwtSecret(env.DB);

      return respondWithCookie(
        {
          success: true,
          accessToken: await generateToken("access", newSecret),
        },
        await generateToken("refresh", newSecret)
      );
    }

    // 4. 登出
    if (action === "logout") {
      return respondWithCookie({ success: true }, "", true);
    }

    // 默认响应
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Auth API Error:", error);
    return new Response(
      JSON.stringify({
        error: ERROR_MESSAGES.SERVER_ERROR,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
