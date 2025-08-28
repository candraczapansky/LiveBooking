// Custom error types for better error handling
export class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
export class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400);
        this.name = 'ValidationError';
        if (details) {
            this.details = details;
        }
    }
}
export class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401);
        this.name = 'AuthenticationError';
    }
}
export class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403);
        this.name = 'AuthorizationError';
    }
}
export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404);
        this.name = 'NotFoundError';
    }
}
export class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409);
        this.name = 'ConflictError';
    }
}
export class DatabaseError extends AppError {
    constructor(message = 'Database operation failed') {
        super(message, 500);
        this.name = 'DatabaseError';
        this.isOperational = false;
    }
}
export class ExternalServiceError extends AppError {
    constructor(service, message = 'External service error') {
        super(`${service}: ${message}`, 502);
        this.name = 'ExternalServiceError';
        this.isOperational = false;
    }
}
// Centralized error handler
export function handleError(error, req) {
    const timestamp = new Date().toISOString();
    const path = req?.path;
    const method = req?.method;
    // Handle known application errors
    if (error instanceof AppError) {
        return {
            error: error.name,
            message: error.message,
            details: error.details,
            timestamp,
            path,
            method,
        };
    }
    // Handle Zod validation errors
    if (error.name === 'ZodError') {
        const details = error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
        }));
        return {
            error: 'ValidationError',
            message: 'Request validation failed',
            details,
            timestamp,
            path,
            method,
        };
    }
    // Handle database errors
    if (error.code === '23505') { // PostgreSQL unique constraint violation
        return {
            error: 'ConflictError',
            message: 'Resource already exists',
            timestamp,
            path,
            method,
        };
    }
    if (error.code === '23503') { // PostgreSQL foreign key constraint violation
        return {
            error: 'ValidationError',
            message: 'Referenced resource does not exist',
            timestamp,
            path,
            method,
        };
    }
    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
        return {
            error: 'AuthenticationError',
            message: 'Invalid token',
            timestamp,
            path,
            method,
        };
    }
    if (error.name === 'TokenExpiredError') {
        return {
            error: 'AuthenticationError',
            message: 'Token expired',
            timestamp,
            path,
            method,
        };
    }
    // Handle unknown errors
    console.error('Unhandled error:', error);
    return {
        error: 'InternalServerError',
        message: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp,
        path,
        method,
    };
}
// Async error wrapper for route handlers
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// Error logging utility
export function logError(error, context) {
    const errorInfo = {
        name: error.name || 'UnknownError',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        context,
    };
    // In production, you might want to send this to a logging service
    if (process.env.NODE_ENV === 'production') {
        console.error('Production Error:', JSON.stringify(errorInfo, null, 2));
    }
    else {
        console.error('Development Error:', errorInfo);
    }
}
