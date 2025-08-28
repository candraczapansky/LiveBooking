import jwt from 'jsonwebtoken';
// Simple API key validation middleware
export function validateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    // For now, use a simple API key. In production, this should be stored securely
    const validApiKey = process.env.EXTERNAL_API_KEY || 'glo-head-spa-external-2024';
    if (!apiKey || apiKey !== validApiKey) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Valid API key required',
            code: 'INVALID_API_KEY'
        });
    }
    next();
}
// Optional API key validation for endpoints that can work with or without auth
export function optionalApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (apiKey) {
        const validApiKey = process.env.EXTERNAL_API_KEY || 'glo-head-spa-external-2024';
        if (apiKey !== validApiKey) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid API key provided',
                code: 'INVALID_API_KEY'
            });
        }
    }
    // Add auth status to request for logging
    req.authenticated = !!apiKey;
    next();
}
// JWT Authentication middleware
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Access token required',
            code: 'MISSING_TOKEN'
        });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
        });
    }
}
// Admin role verification middleware
export function requireAdmin(req, res, next) {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
        });
    }
    if (user.role !== 'admin') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Admin privileges required',
            code: 'INSUFFICIENT_PERMISSIONS'
        });
    }
    next();
}
