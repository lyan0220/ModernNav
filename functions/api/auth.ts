interface Env {
  DB: D1Database;
}

// 导入共享工具
import {
  sign,
  verify,
  generateToken,
  respondWithCookie,
  RateLimiter,
  getClientIP,
  ERROR_MESSAGES,
} from "./utils/authHelpers";

// 创建速率限制器实例
const authRateLimiter = new RateLimiter(15, 15 * 60 * 1000); // 15分钟内最多15次登录尝试

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
    if (!authRateLimiter.isAllowed(clientIP)) {
      const resetTime = authRateLimiter.getResetTime(clientIP);
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

    const body = (await request.json()) as any;
    const { action, code, currentCode, newCode } = body;

    // 输入验证
    if (!action || typeof action !== "string") {
      return new Response(
        JSON.stringify({ error: ERROR_MESSAGES.INVALID_DATA }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const codeRow = await env.DB.prepare(
      "SELECT value FROM config WHERE key = 'auth_code'"
    ).first<{ value: string }>();
    const storedCode = codeRow?.value || "admin";
    console.log(
      `Auth check: codeRow=${JSON.stringify(
        codeRow
      )}, storedCode="${storedCode}"`
    );

    // 1. 登录
    if (action === "login") {
      if (!code || typeof code !== "string") {
        return new Response(
          JSON.stringify({ error: ERROR_MESSAGES.INVALID_CREDENTIALS }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (code !== storedCode) {
        console.log(`Login failed: provided="${code}", stored="${storedCode}"`);
        return new Response(
          JSON.stringify({ error: ERROR_MESSAGES.INVALID_CREDENTIALS }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return respondWithCookie(
        {
          success: true,
          accessToken: await generateToken("access", storedCode),
        },
        await generateToken("refresh", storedCode)
      );
    }

    // 2. 刷新 Token
    if (action === "refresh") {
      const rfToken = request.headers
        .get("Cookie")
        ?.match(/refresh_token=([^;]+)/)?.[1];

      if (!rfToken) {
        return respondWithCookie(
          { error: ERROR_MESSAGES.INVALID_TOKEN },
          "",
          true
        );
      }

      try {
        // 验证刷新令牌是否有效
        const isValid = await verify(rfToken, storedCode);
        if (!isValid) {
          return respondWithCookie(
            { error: ERROR_MESSAGES.INVALID_TOKEN },
            "",
            true
          );
        }
      } catch (error) {
        console.error("Token verification error:", error);
        return respondWithCookie(
          { error: ERROR_MESSAGES.INVALID_TOKEN },
          "",
          true
        );
      }

      return respondWithCookie(
        {
          success: true,
          accessToken: await generateToken("access", storedCode),
        },
        await generateToken("refresh", storedCode)
      );
    }

    // 3. 修改密码
    if (action === "update") {
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

      if (!(await verify(token, storedCode))) {
        return new Response(
          JSON.stringify({ error: ERROR_MESSAGES.UNAUTHORIZED }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (
        !currentCode ||
        !newCode ||
        typeof currentCode !== "string" ||
        typeof newCode !== "string"
      ) {
        return new Response(
          JSON.stringify({ error: ERROR_MESSAGES.INVALID_DATA }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (currentCode !== storedCode) {
        return new Response(
          JSON.stringify({ error: ERROR_MESSAGES.INVALID_CREDENTIALS }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // 密码强度检查
      if (newCode.length < 4) {
        return new Response(
          JSON.stringify({
            error: "New code must be at least 4 characters long",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      await env.DB.prepare(
        "INSERT INTO config (key, value) VALUES ('auth_code', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      )
        .bind(newCode)
        .run();

      // 更新本地存储的密码值，以便在同一请求中后续使用
      const updatedStoredCode = newCode;

      return respondWithCookie(
        {
          success: true,
          accessToken: await generateToken("access", updatedStoredCode),
        },
        await generateToken("refresh", updatedStoredCode)
      );
    }

    // 4. 登出
    if (action === "logout") {
      // 清除刷新令牌
      return respondWithCookie({ success: true }, "", true);
    }

    // 默认响应（用于其他操作）
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
