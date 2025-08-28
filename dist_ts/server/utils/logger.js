import { createLogger, format, transports } from 'winston';
// Log levels
export var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "error";
    LogLevel["WARN"] = "warn";
    LogLevel["INFO"] = "info";
    LogLevel["DEBUG"] = "debug";
})(LogLevel || (LogLevel = {}));
// Create logger instance
const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
    defaultMeta: { service: 'glo-head-spa' },
    transports: [
        // Console transport for development
        new transports.Console({
            format: format.combine(format.colorize(), format.simple(), format.printf(({ timestamp, level, message, ...meta }) => {
                return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
            })),
        }),
    ],
});
// Add file transport for production
if (process.env.NODE_ENV === 'production') {
    logger.add(new transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }));
    logger.add(new transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }));
}
// Logging utility functions
export class LoggerService {
    static generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    static error(message, context, error) {
        logger.error(message, {
            ...context,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            } : undefined,
        });
    }
    static warn(message, context) {
        logger.warn(message, context);
    }
    static info(message, context) {
        logger.info(message, context);
    }
    static debug(message, context) {
        logger.debug(message, context);
    }
    // Request logging
    static logRequest(req, res, next) {
        const requestId = this.generateRequestId();
        const startTime = Date.now();
        // Add request ID to request object
        req.requestId = requestId;
        // Log request start
        this.info('Request started', {
            requestId,
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id,
        });
        // Log response
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const level = res.statusCode >= 400 ? 'warn' : 'info';
            logger.log(level, 'Request completed', {
                requestId,
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                userId: req.user?.id,
            });
        });
        next();
    }
    // Database operation logging
    static logDatabaseOperation(operation, table, context) {
        this.debug(`Database ${operation} on ${table}`, context);
    }
    // Authentication logging
    static logAuthentication(action, userId, context) {
        this.info(`Authentication: ${action}`, {
            ...context,
            userId,
        });
    }
    // Payment logging
    static logPayment(action, amount, context) {
        this.info(`Payment: ${action}`, {
            ...context,
            amount,
        });
    }
    // Appointment logging
    static logAppointment(action, appointmentId, context) {
        this.info(`Appointment: ${action}`, {
            ...context,
            appointmentId,
        });
    }
    // Email/SMS logging
    static logCommunication(type, action, context) {
        this.info(`${type.toUpperCase()}: ${action}`, context);
    }
}
// Middleware to add logging context to requests
export function addLoggingContext(req, res, next) {
    const context = {
        requestId: req.requestId,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
    };
    req.logContext = context;
    next();
}
// Utility to get logger context from request
export function getLogContext(req) {
    return req.logContext || {};
}
export default LoggerService;
