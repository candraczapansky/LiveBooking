// Simple in-memory cache implementation
// In production, you'd want to use Redis or a similar distributed cache
class MemoryCache {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    }
    set(key, data, ttl = this.defaultTTL) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
        });
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    delete(key) {
        return this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    // Clear expired entries
    cleanup() {
        const now = Date.now();
        this.cache.forEach((entry, key) => {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        });
    }
    // Get cache statistics
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }
}
// Global cache instance
const cache = new MemoryCache();
// Cache middleware for Express routes
export function cacheMiddleware(ttl = 5 * 60 * 1000) {
    return (req, res, next) => {
        const key = `api:${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;
        const cached = cache.get(key);
        if (cached) {
            return res.json(cached);
        }
        // Override res.json to cache the response
        const originalJson = res.json;
        res.json = function (data) {
            cache.set(key, data, ttl);
            return originalJson.call(this, data);
        };
        next();
    };
}
// Cache invalidation utilities
export function invalidateCache(pattern) {
    const stats = cache.getStats();
    for (const key of stats.keys) {
        if (key.includes(pattern)) {
            cache.delete(key);
        }
    }
}
export function invalidateUserCache(userId) {
    invalidateCache(`user:${userId}`);
    invalidateCache(`appointments:client:${userId}`);
}
export function invalidateAppointmentCache() {
    invalidateCache('appointments');
    invalidateCache('api:GET:/api/appointments');
}
export function invalidateServiceCache() {
    invalidateCache('services');
    invalidateCache('api:GET:/api/services');
}
// Cache key generators
export function generateCacheKey(prefix, params) {
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}:${params[key]}`)
        .join(':');
    return `${prefix}:${sortedParams}`;
}
// Cache decorator for functions
export function cached(ttl = 5 * 60 * 1000) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = async function (...args) {
            const key = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
            const cached = cache.get(key);
            if (cached) {
                return cached;
            }
            const result = await method.apply(this, args);
            cache.set(key, result, ttl);
            return result;
        };
    };
}
// Scheduled cache cleanup
setInterval(() => {
    cache.cleanup();
}, 10 * 60 * 1000); // Clean up every 10 minutes
export default cache;
