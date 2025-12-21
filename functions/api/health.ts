interface Env {
  DB: D1Database;
}

import { logger } from "./utils/logger";

export const onRequestGet = async ({ env }: { env: Env }) => {
  const startTime = Date.now();
  let status = "healthy";
  let statusCode = 200;
  const checks: any = {};

  try {
    // 检查数据库连接
    try {
      await env.DB.prepare("SELECT 1").first();
      checks.database = {
        status: "healthy",
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      checks.database = { status: "unhealthy", error: error.message };
      status = "degraded";
      statusCode = 503;
    }

    // 检查系统内存使用情况（简单检查）
    const memoryUsage = (performance as any).memory;
    if (memoryUsage) {
      const usedMB = Math.round(memoryUsage.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(memoryUsage.totalJSHeapSize / 1024 / 1024);
      checks.memory = {
        used: `${usedMB}MB`,
        total: `${totalMB}MB`,
        percentage: Math.round((usedMB / totalMB) * 100),
      };

      if (checks.memory.percentage > 90) {
        status = "degraded";
        statusCode = 503;
      }
    }

    // 检查最近错误
    const recentErrors = logger.getLogs(3, 10); // 获取最近10条错误日志
    checks.recentErrors = {
      count: recentErrors.length,
      details: recentErrors.map((log) => ({
        timestamp: log.timestamp,
        message: log.message,
      })),
    };

    if (recentErrors.length > 5) {
      status = "degraded";
      statusCode = 503;
    }

    // 检查系统启动时间
    const uptime = Date.now() - (globalThis as any).startTime;
    checks.uptime = {
      milliseconds: uptime,
      human: formatUptime(uptime),
    };

    // 记录健康检查
    logger.info("Health check completed", { status, checks });

    return new Response(
      JSON.stringify({
        status,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        checks,
      }),
      {
        status: statusCode,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      }
    );
  } catch (error) {
    logger.error("Health check failed", error);

    return new Response(
      JSON.stringify({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      }
    );
  }
};

// 格式化运行时间
function formatUptime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// 记录启动时间
(globalThis as any).startTime = (globalThis as any).startTime || Date.now();
