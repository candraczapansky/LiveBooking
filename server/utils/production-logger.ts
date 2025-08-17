import winston from 'winston';
import { Request } from 'express';

// Log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Colors for different log levels
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Custom format for JSON logging (production)
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  format: process.env.NODE_ENV === 'development' ? logFormat : jsonFormat,
  transports: [
    // Console transport
    new winston.transports.Console(),
    
    // File transports for production
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ] : []),
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Request context interface
interface RequestContext {
  requestId: string;
  userId?: number;
  ip: string;
  userAgent: string;
  method: string;
  url: string;
  duration?: number;
}

// Generate request ID
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Extract request context
function getRequestContext(req: Request): RequestContext {
  return {
    requestId: (req as any).requestId || generateRequestId(),
    userId: (req as any).user?.id,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    method: req.method,
    url: req.url,
  };
}

// Enhanced logging methods
export class ProductionLogger {
  // Request logging
  static logRequest(req: Request, res: any, duration: number) {
    const context = getRequestContext(req);
    const logData = {
      ...context,
      duration,
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length'),
    };

    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed successfully', logData);
    }
  }

  // Authentication logging
  static logAuthentication(action: string, userId: number, context: any) {
    logger.info('Authentication event', {
      action,
      userId,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  // Security event logging
  static logSecurityEvent(event: string, details: any) {
    logger.warn('Security event detected', {
      event,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  // Database operation logging
  static logDatabaseOperation(operation: string, table: string, duration: number, success: boolean) {
    const level = success ? 'debug' : 'error';
    logger[level]('Database operation', {
      operation,
      table,
      duration,
      success,
      timestamp: new Date().toISOString(),
    });
  }

  // API error logging
  static logApiError(error: any, req: Request, additionalContext?: any) {
    const context = getRequestContext(req);
    logger.error('API error occurred', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...context,
      ...additionalContext,
      timestamp: new Date().toISOString(),
    });
  }

  // Performance logging
  static logPerformance(operation: string, duration: number, details?: any) {
    const level = duration > 1000 ? 'warn' : 'debug';
    logger[level]('Performance metric', {
      operation,
      duration,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  // Business event logging
  static logBusinessEvent(event: string, userId: number, details: any) {
    logger.info('Business event', {
      event,
      userId,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  // System health logging
  static logSystemHealth(component: string, status: 'healthy' | 'unhealthy', details?: any) {
    const level = status === 'healthy' ? 'info' : 'error';
    logger[level]('System health check', {
      component,
      status,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  // Rate limiting logging
  static logRateLimit(ip: string, endpoint: string, limit: number) {
    logger.warn('Rate limit exceeded', {
      ip,
      endpoint,
      limit,
      timestamp: new Date().toISOString(),
    });
  }

  // SQL injection attempt logging
  static logSqlInjectionAttempt(req: Request, pattern: string) {
    const context = getRequestContext(req);
    logger.error('SQL injection attempt detected', {
      pattern,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  // XSS attempt logging
  static logXssAttempt(req: Request, pattern: string) {
    const context = getRequestContext(req);
    logger.error('XSS attempt detected', {
      pattern,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  // Memory usage logging
  static logMemoryUsage() {
    const usage = process.memoryUsage();
    logger.debug('Memory usage', {
      rss: `${Math.round(usage.rss / 1024 / 1024 * 100) / 100} MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
      external: `${Math.round(usage.external / 1024 / 1024 * 100) / 100} MB`,
      timestamp: new Date().toISOString(),
    });
  }

  // Database connection logging
  static logDatabaseConnection(status: 'connected' | 'disconnected' | 'error', details?: any) {
    const level = status === 'connected' ? 'info' : 'error';
    logger[level]('Database connection', {
      status,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  // External API call logging
  static logExternalApiCall(service: string, endpoint: string, duration: number, success: boolean) {
    const level = success ? 'debug' : 'error';
    logger[level]('External API call', {
      service,
      endpoint,
      duration,
      success,
      timestamp: new Date().toISOString(),
    });
  }

  // User activity logging
  static logUserActivity(userId: number, action: string, details?: any) {
    logger.info('User activity', {
      userId,
      action,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  // Error with context
  static error(message: string, context?: any) {
    logger.error(message, {
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  // Warning with context
  static warn(message: string, context?: any) {
    logger.warn(message, {
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  // Info with context
  static info(message: string, context?: any) {
    logger.info(message, {
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  // Debug with context
  static debug(message: string, context?: any) {
    logger.debug(message, {
      ...context,
      timestamp: new Date().toISOString(),
    });
  }
}

// Middleware to add request ID and logging
export function requestLoggingMiddleware(req: Request, res: any, next: any) {
  // Generate request ID
  (req as any).requestId = generateRequestId();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', (req as any).requestId);
  
  // Log request start
  const start = Date.now();
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - start;
    ProductionLogger.logRequest(req, res, duration);
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

// Error handling middleware
export function errorHandlingMiddleware(error: any, req: Request, res: any, next: any) {
  // Log the error
  ProductionLogger.logApiError(error, req);
  
  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;
  
  res.status(500).json({
    error: 'InternalServerError',
    message,
    requestId: (req as any).requestId,
    timestamp: new Date().toISOString(),
  });
}

// Memory monitoring
export function startMemoryMonitoring(intervalMs: number = 300000) { // 5 minutes
  setInterval(() => {
    ProductionLogger.logMemoryUsage();
  }, intervalMs);
}

// Health check logging
export function logHealthCheck(component: string, status: any) {
  ProductionLogger.logSystemHealth(component, status.healthy ? 'healthy' : 'unhealthy', status);
}

export default ProductionLogger; 