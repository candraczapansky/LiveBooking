import { createLogger, format, transports, Logger } from 'winston';

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

// Log context interface
export interface LogContext {
  userId?: number;
  requestId?: string;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

// Create logger instance
const logger: Logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'glo-head-spa' },
  transports: [
    // Console transport for development
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple(),
        format.printf(({ timestamp, level, message, ...meta }: any) => {
          return `${timestamp} [${level}]: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`;
        })
      ),
    }),
  ],
});

// Add file transport for production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  
  logger.add(
    new transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Logging utility functions
export class LoggerService {
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static error(message: string, context?: LogContext, error?: Error) {
    logger.error(message, {
      ...context,
      error: error ? {
        name: error?.name || 'UnknownError',
        message: error?.message || 'Unknown error',
        stack: error?.stack,
      } : undefined,
    });
  }

  static warn(message: string, context?: LogContext) {
    logger.warn(message, context);
  }

  static info(message: string, context?: LogContext) {
    logger.info(message, context);
  }

  static debug(message: string, context?: LogContext) {
    logger.debug(message, context);
  }

  // Request logging
  static logRequest(req: any, res: any, next: any) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // Add request ID to request object
    (req as any).requestId = requestId;

    // Log request start
    this.info('Request started', {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
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
        userId: (req as any).user?.id,
      });
    });

    next();
  }

  // Database operation logging
  static logDatabaseOperation(operation: string, table: string, context?: LogContext) {
    this.debug(`Database ${operation} on ${table}`, context);
  }

  // Authentication logging
  static logAuthentication(action: string, userId?: number, context?: LogContext) {
    this.info(`Authentication: ${action}`, {
      ...context,
      userId,
    });
  }

  // Payment logging
  static logPayment(action: string, amount?: number, context?: LogContext) {
    this.info(`Payment: ${action}`, {
      ...context,
      amount,
    });
  }

  // Appointment logging
  static logAppointment(action: string, appointmentId?: number, context?: LogContext) {
    this.info(`Appointment: ${action}`, {
      ...context,
      appointmentId,
    });
  }

  // Email/SMS logging
  static logCommunication(type: 'email' | 'sms', action: string, context?: LogContext) {
    this.info(`${type.toUpperCase()}: ${action}`, context);
  }
}

// Middleware to add logging context to requests
export function addLoggingContext(req: any, res: any, next: any) {
  const context: LogContext = {
    requestId: (req as any).requestId,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
  };

  (req as any).logContext = context;
  next();
}

// Utility to get logger context from request
export function getLogContext(req: any): LogContext {
  return (req as any).logContext || {};
}

export default LoggerService; 