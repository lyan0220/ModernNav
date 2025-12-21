interface Env {
  DB: D1Database;
}

// 简单内存缓存，减少数据库查询
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60秒缓存

export const onRequestGet = async ({ env }: { env: Env }) => {
  try {
    // 检查缓存
    const cacheKey = "bootstrap_data";
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=30",
        },
      });
    }

    // 从数据库获取数据
    const { results } = await env.DB.prepare(
      "SELECT key, value FROM config"
    ).all<{ key: string; value: string }>();

    const configMap = new Map();
    results?.forEach((row) => configMap.set(row.key, row.value));

    // 验证和解析数据
    let categories = [];
    let background = null;
    let prefs = null;

    try {
      categories = JSON.parse(configMap.get("categories") || "[]");

      // 验证categories结构
      if (!Array.isArray(categories)) {
        console.warn("Invalid categories format in database, using default");
        categories = [];
      }
    } catch (e) {
      console.error("Error parsing categories from database:", e);
      categories = [];
    }

    try {
      background = configMap.get("background") || null;

      // 验证background格式
      if (background && typeof background !== "string") {
        console.warn("Invalid background format in database, using default");
        background = null;
      }
    } catch (e) {
      console.error("Error parsing background from database:", e);
      background = null;
    }

    try {
      prefs = JSON.parse(configMap.get("prefs") || "null");

      // 验证prefs结构
      if (prefs && typeof prefs !== "object") {
        console.warn("Invalid prefs format in database, using default");
        prefs = null;
      }
    } catch (e) {
      console.error("Error parsing prefs from database:", e);
      prefs = null;
    }

    const authCode = configMap.get("auth_code");
    const responseData = {
      categories,
      background,
      prefs,
      isDefaultCode: !authCode || authCode === "admin",
    };

    // 更新缓存
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    });

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30",
        ETag: `"${Date.now()}"`, // 简单的ETag
      },
    });
  } catch (error) {
    console.error("Bootstrap API Error:", error);

    // 即使出错也返回基本结构，确保前端能正常工作
    return new Response(
      JSON.stringify({
        categories: [],
        background: null,
        prefs: null,
        isDefaultCode: true,
        error: "Failed to load configuration",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
