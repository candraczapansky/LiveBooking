import winston from 'winston';
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
const logFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston.format.colorize({ all: true }), winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`));
// Custom format for JSON logging (production)
const jsonFormat = winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json());
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
// Generate request ID
function generateRequestId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
// Extract request context
function getRequestContext(req) {
    return {
        requestId: req.requestId || generateRequestId(),
        userId: req.user?.id,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        method: req.method,
        url: req.url,
    };
}
// Enhanced logging methods
export class ProductionLogger {
    // Request logging
    static logRequest(req, res, duration) {
        const context = getRequestContext(req);
        const logData = {
            ...context,
            duration,
            statusCode: res.statusCode,
            contentLength: res.get('Content-Length'),
        };
        if (res.statusCode >= 400) {
            logger.warn('Request completed with error', logData);
        }
        else {
            logger.info('Request completed successfully', logData);
        }
    }
    // Authentication logging
    static logAuthentication(action, userId, context) {
        logger.info('Authentication event', {
            action,
            userId,
            ...context,
            timestamp: new Date().toISOString(),
        });
    }
    // Security event logging
    static logSecurityEvent(event, details) {
        logger.warn('Security event detected', {
            event,
            ...details,
            timestamp: new Date().toISOString(),
        });
    }
    // Database operation logging
    static logDatabaseOperation(operation, table, duration, success) {
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
    static logApiError(error, req, additionalContext) {
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
    static logPerformance(operation, duration, details) {
        const level = duration > 1000 ? 'warn' : 'debug';
        logger[level]('Performance metric', {
            operation,
            duration,
            ...details,
            timestamp: new Date().toISOString(),
        });
    }
    // Business event logging
    static logBusinessEvent(event, userId, details) {
        logger.info('Business event', {
            event,
            userId,
            ...details,
            timestamp: new Date().toISOString(),
        });
    }
    // System health logging
    static logSystemHealth(component, status, details) {
        const level = status === 'healthy' ? 'info' : 'error';
        logger[level]('System health check', {
            component,
            status,
            ...details,
            timestamp: new Date().toISOString(),
        });
    }
    // Rate limiting logging
    static logRateLimit(ip, endpoint, limit) {
        logger.warn('Rate limit exceeded', {
            ip,
            endpoint,
            limit,
            timestamp: new Date().toISOString(),
        });
    }
    // SQL injection attempt logging
    static logSqlInjectionAttempt(req, pattern) {
        const context = getRequestContext(req);
        logger.error('SQL injection attempt detected', {
            pattern,
            ...context,
            timestamp: new Date().toISOString(),
        });
    }
    // XSS attempt logging
    static logXssAttempt(req, pattern) {
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
    static logDatabaseConnection(status, details) {
        const level = status === 'connected' ? 'info' : 'error';
        logger[level]('Database connection', {
            status,
            ...details,
            timestamp: new Date().toISOString(),
        });
    }
    // External API call logging
    static logExternalApiCall(service, endpoint, duration, success) {
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
    static logUserActivity(userId, action, details) {
        logger.info('User activity', {
            userId,
            action,
            ...details,
            timestamp: new Date().toISOString(),
        });
    }
    // Error with context
    static error(message, context) {
        logger.error(message, {
            ...context,
            timestamp: new Date().toISOString(),
        });
    }
    // Warning with context
    static warn(message, context) {
        logger.warn(message, {
            ...context,
            timestamp: new Date().toISOString(),
        });
    }
    // Info with context
    static info(message, context) {
        logger.info(message, {
            ...context,
            timestamp: new Date().toISOString(),
        });
    }
    // Debug with context
    static debug(message, context) {
        logger.debug(message, {
            ...context,
            timestamp: new Date().toISOString(),
        });
    }
}
// Middleware to add request ID and logging
export function requestLoggingMiddleware(req, res, next) {
    // Generate request ID
    req.requestId = generateRequestId();
    // Add request ID to response headers
    res.setHeader('X-Request-ID', req.requestId);
    // Log request start
    const start = Date.now();
    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
        const duration = Date.now() - start;
        ProductionLogger.logRequest(req, res, duration);
        originalEnd.call(this, chunk, encoding);
    };
    next();
}
// Error handling middleware
export function errorHandlingMiddleware(error, req, res, next) {
    // Log the error
    ProductionLogger.logApiError(error, req);
    // Don't expose internal errors in production
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message;
    res.status(500).json({
        error: 'InternalServerError',
        message,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
    });
}
// Memory monitoring
export function startMemoryMonitoring(intervalMs = 300000) {
    setInterval(() => {
        ProductionLogger.logMemoryUsage();
    }, intervalMs);
}
// Health check logging
export function logHealthCheck(component, status) {
    ProductionLogger.logSystemHealth(component, status.healthy ? 'healthy' : 'unhealthy', status);
}
export default ProductionLogger;
