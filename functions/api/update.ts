interface Env {
  DB: D1Database;
}

// 导入共享工具
import { verify, getClientIP, RateLimiter, ERROR_MESSAGES } from "./utils/authHelpers";

// 创建速率限制器实例
const updateRateLimiter = new RateLimiter(20, 60 * 1000); // 1分钟内最多20次更新请求

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Env;
}) => {
  try {
    const clientIP = getClientIP(request);

    // 检查速率限制
    if (!updateRateLimiter.isAllowed(clientIP)) {
      const resetTime = updateRateLimiter.getResetTime(clientIP);
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

    // 1. 鉴权
    const token = request.headers.get("Authorization")?.split(" ")[1];

    if (!token) {
      return new Response(
        JSON.stringify({ error: ERROR_MESSAGES.UNAUTHORIZED }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const codeRow = await env.DB.prepare(
      "SELECT value FROM config WHERE key = 'auth_code'"
    ).first<{ value: string }>();
    const storedCode = codeRow?.value || "admin";

    if (!(await verify(token, storedCode))) {
      return new Response(
        JSON.stringify({ error: ERROR_MESSAGES.UNAUTHORIZED }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 2. 验证请求数据
    const requestBody = await request.json();

    if (!requestBody || typeof requestBody !== "object") {
      return new Response(
        JSON.stringify({ error: ERROR_MESSAGES.INVALID_DATA }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { type, data } = requestBody as any;

    if (!type || typeof type !== "string") {
      return new Response(
        JSON.stringify({ error: ERROR_MESSAGES.INVALID_DATA }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 验证数据类型
    if (data === undefined || data === null) {
      return new Response(
        JSON.stringify({ error: ERROR_MESSAGES.INVALID_DATA }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 限制可更新的配置项类型，防止恶意更新
    const allowedTypes = ["categories", "background", "prefs", "auth_code"];
    if (!allowedTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: ERROR_MESSAGES.INVALID_DATA }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. 写入数据 (利用 UPSERT)
    const value = typeof data === "string" ? data : JSON.stringify(data);

    // 对于大型数据，进行大小限制
    if (value.length > 100000) {
      // 100KB限制
      return new Response(
        JSON.stringify({
          error: "Data too large",
          maxSize: "100KB",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    await env.DB.prepare(
      "INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
      .bind(type, value)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Update API Error:", error);
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
