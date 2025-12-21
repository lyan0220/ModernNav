// 日志记录工具

// 日志级别
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// 日志条目接口
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: any;
  ip?: string;
  userAgent?: string;
}

// 简单的内存日志存储（生产环境可考虑持久化到数据库）
const logs: LogEntry[] = [];
const MAX_LOGS = 1000; // 最大保留日志数

// 获取客户端IP和User-Agent
export function extractClientInfo(request: Request): { ip: string; userAgent: string } {
  return {
    ip: request.headers.get("CF-Connecting-IP") || 
         request.headers.get("X-Forwarded-For") || 
         "unknown",
    userAgent: request.headers.get("User-Agent") || "unknown"
  };
}

// 添加日志条目
function addLog(level: LogLevel, message: string, details?: any, request?: Request): void {
  const clientInfo = request ? extractClientInfo(request) : { ip: "system", userAgent: "system" };
  
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    details,
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent
  };
  
  logs.push(entry);
  
  // 保持日志数量在限制内
  if (logs.length > MAX_LOGS) {
    logs.splice(0, logs.length - MAX_LOGS);
  }
  
  // 在开发环境输出到控制台
  if (level >= LogLevel.INFO) {
    const levelName = LogLevel[level];
    console.log(`[${levelName}] ${entry.timestamp} - ${message}`, details || '');
  }
}

// 日志记录函数
export const logger = {
  debug: (message: string, details?: any, request?: Request) => addLog(LogLevel.DEBUG, message, details, request),
  info: (message: string, details?: any, request?: Request) => addLog(LogLevel.INFO, message, details, request),
  warn: (message: string, details?: any, request?: Request) => addLog(LogLevel.WARN, message, details, request),
  error: (message: string, details?: any, request?: Request) => addLog(LogLevel.ERROR, message, details, request),
  
  // 获取日志
  getLogs: (level?: LogLevel, limit?: number): LogEntry[] => {
    let filteredLogs = logs;
    
    if (level !== undefined) {
      filteredLogs = logs.filter(log => log.level >= level);
    }
    
    if (limit !== undefined && limit > 0) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    return filteredLogs;
  },
  
  // 清除日志
  clear: (): void => {
    logs.length = 0;
  }
};

// 错误日志助手
export function logError(error: Error, context?: string, request?: Request): void {
  const details: any = {
    name: error.name,
    message: error.message,
    stack: error.stack
  };
  
  if (context) {
    details.context = context;
  }
  
  logger.error(`Unhandled error: ${error.message}`, details, request);
}
