import { handleError } from '../utils/errors.js';
import LoggerService from '../utils/logger.js';
import jwt from 'jsonwebtoken';
// Global error handling middleware
export function errorHandler(error, req, res, next) {
    // Log the error
    LoggerService.error('Unhandled error occurred', {
        requestId: req.requestId,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
    }, error);
    // Handle the error and get response
    const errorResponse = handleError(error, req);
    // Send error response
    res.status(errorResponse.error === 'ValidationError' ? 400 :
        errorResponse.error === 'AuthenticationError' ? 401 :
            errorResponse.error === 'AuthorizationError' ? 403 :
                errorResponse.error === 'NotFoundError' ? 404 :
                    errorResponse.error === 'ConflictError' ? 409 :
                        errorResponse.error === 'ExternalServiceError' ? 502 : 500)
        .json(errorResponse);
}
// 404 handler for unmatched routes
export function notFoundHandler(req, res) {
    LoggerService.warn('Route not found', {
        requestId: req.requestId,
        path: req.path,
        method: req.method,
    });
    res.status(404).json({
        error: 'NotFoundError',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
    });
}
// Request validation middleware
export function validateRequest(schema) {
    return (req, res, next) => {
        console.log("🔍 DEBUG: validateRequest middleware hit for path:", req.path);
        console.log("🔍 DEBUG: Request body:", JSON.stringify(req.body, null, 2));
        try {
            const validatedData = schema.parse(req.body);
            req.body = validatedData;
            console.log("🔍 DEBUG: Validation successful");
            next();
        }
        catch (error) {
            console.log("🔍 DEBUG: Validation failed:", error.errors);
            LoggerService.warn('Request validation failed', {
                requestId: req.requestId,
                path: req.path,
                method: req.method,
                validationErrors: error.errors,
            });
            const errorResponse = handleError(error, req);
            res.status(400).json(errorResponse);
        }
    };
}
// Authentication middleware with proper error handling
export function requireAuth(req, res, next) {
    try {
        // Check for user in request (from session/token system)
        let user = req.user;
        // If no user in request, check for JWT token in Authorization header
        if (!user) {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
                    user = decoded;
                    req.user = user;
                }
                catch (error) {
                    LoggerService.warn('Invalid JWT token', {
                        requestId: req.requestId,
                        path: req.path,
                        method: req.method,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                    return res.status(401).json({
                        error: 'AuthenticationError',
                        message: 'Invalid or expired token',
                        timestamp: new Date().toISOString(),
                        path: req.path,
                        method: req.method,
                    });
                }
            }
        }
        // Fallback: check for user ID in headers or query params (for backward compatibility)
        if (!user) {
            const userId = req.headers['x-user-id'] || req.query.userId;
            if (userId) {
                // For now, just set a basic user object
                // In a real system, you'd verify the user exists in the database
                user = { id: userId };
                req.user = user;
            }
        }
        // Development mode: allow requests without authentication for testing
        if (!user && process.env.NODE_ENV === 'development') {
            LoggerService.warn('Development mode: Allowing unauthenticated request', {
                requestId: req.requestId,
                path: req.path,
                method: req.method,
            });
            // Create a default user for development
            user = {
                id: 1,
                username: 'admin',
                role: 'admin',
                email: 'admin@admin.com'
            };
            req.user = user;
        }
        if (!user) {
            LoggerService.warn('Authentication required', {
                requestId: req.requestId,
                path: req.path,
                method: req.method,
            });
            return res.status(401).json({
                error: 'AuthenticationError',
                message: 'Authentication required',
                timestamp: new Date().toISOString(),
                path: req.path,
                method: req.method,
            });
        }
        next();
    }
    catch (error) {
        LoggerService.error('Authentication middleware error', {
            requestId: req.requestId,
            path: req.path,
            method: req.method,
        }, error);
        const errorResponse = handleError(error, req);
        res.status(401).json(errorResponse);
    }
}
// Authorization middleware
export function requireRole(allowedRoles) {
    return (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                LoggerService.warn('Authentication required for role check', {
                    requestId: req.requestId,
                    path: req.path,
                    method: req.method,
                });
                return res.status(401).json({
                    error: 'AuthenticationError',
                    message: 'Authentication required',
                    timestamp: new Date().toISOString(),
                    path: req.path,
                    method: req.method,
                });
            }
            if (!allowedRoles.includes(user.role)) {
                LoggerService.warn('Insufficient permissions', {
                    requestId: req.requestId,
                    path: req.path,
                    method: req.method,
                    userId: user.id,
                    userRole: user.role,
                    requiredRoles: allowedRoles,
                });
                return res.status(403).json({
                    error: 'AuthorizationError',
                    message: 'Insufficient permissions',
                    timestamp: new Date().toISOString(),
                    path: req.path,
                    method: req.method,
                });
            }
            next();
        }
        catch (error) {
            LoggerService.error('Authorization middleware error', {
                requestId: req.requestId,
                path: req.path,
                method: req.method,
            }, error);
            const errorResponse = handleError(error, req);
            res.status(403).json(errorResponse);
        }
    };
}
// Rate limiting middleware (basic implementation)
export function rateLimit(options) {
    const requests = new Map();
    return (req, res, next) => {
        const key = req.ip || 'unknown';
        const now = Date.now();
        const windowStart = now - options.windowMs;
        const userRequests = requests.get(key);
        if (!userRequests || userRequests.resetTime < now) {
            requests.set(key, { count: 1, resetTime: now + options.windowMs });
            return next();
        }
        if (userRequests.count >= options.max) {
            LoggerService.warn('Rate limit exceeded', {
                requestId: req.requestId,
                path: req.path,
                method: req.method,
                ip: req.ip,
            });
            return res.status(429).json({
                error: 'RateLimitError',
                message: 'Too many requests',
                timestamp: new Date().toISOString(),
                path: req.path,
                method: req.method,
            });
        }
        userRequests.count++;
        next();
    };
}
