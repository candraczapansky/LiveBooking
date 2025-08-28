import { eq, and, or, inArray, desc, asc, ilike } from 'drizzle-orm';
import LoggerService from './logger.js';
// Query optimization utilities
export class QueryOptimizer {
    // Optimize pagination queries
    static optimizePagination(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        return { limit, offset };
    }
    // Optimize date range queries
    static optimizeDateRange(startDate, endDate) {
        if (!startDate && !endDate)
            return null;
        const conditions = [];
        if (startDate) {
            const start = startDate instanceof Date ? startDate : new Date(startDate);
            // Note: This would need to be implemented with actual column references
            // conditions.push(gte(column, start));
        }
        if (endDate) {
            const end = endDate instanceof Date ? endDate : new Date(endDate);
            // Note: This would need to be implemented with actual column references
            // conditions.push(lte(column, end));
        }
        return conditions.length > 0 ? and(...conditions) : null;
    }
    // Optimize search queries
    static optimizeSearch(searchTerm, searchFields = []) {
        if (!searchTerm || searchFields.length === 0)
            return null;
        const searchConditions = searchFields.map(field => ilike(field, `%${searchTerm}%`));
        return searchConditions.length > 0 ? or(...searchConditions) : null;
    }
    // Optimize sorting
    static optimizeSorting(sortBy, sortOrder = 'desc') {
        if (!sortBy)
            return null;
        return sortOrder === 'asc' ? asc(sortBy) : desc(sortBy);
    }
    // Optimize filtering
    static optimizeFiltering(filters) {
        const conditions = [];
        for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null && value !== '') {
                if (Array.isArray(value)) {
                    conditions.push(inArray(key, value));
                }
                else {
                    conditions.push(eq(key, value));
                }
            }
        }
        return conditions.length > 0 ? and(...conditions) : null;
    }
    // Query performance monitoring
    static logQueryPerformance(query, startTime, context) {
        const duration = Date.now() - startTime;
        const queryKey = this.getQueryKey(query);
        // Track query frequency
        const existing = this.queryCache.get(queryKey);
        if (existing) {
            existing.count++;
            existing.timestamp = Date.now();
        }
        else {
            this.queryCache.set(queryKey, {
                query,
                timestamp: Date.now(),
                count: 1
            });
        }
        // Log slow queries
        if (duration > 1000) { // Log queries taking more than 1 second
            LoggerService.warn('Slow query detected', {
                ...context,
                query: queryKey,
                duration: `${duration}ms`,
                count: existing?.count || 1
            });
        }
        // Log query performance
        LoggerService.debug('Query executed', {
            ...context,
            query: queryKey,
            duration: `${duration}ms`
        });
        return duration;
    }
    // Get query statistics
    static getQueryStats() {
        const stats = Array.from(this.queryCache.entries()).map(([key, value]) => ({
            query: key,
            count: value.count,
            lastExecuted: new Date(value.timestamp).toISOString()
        }));
        return stats.sort((a, b) => b.count - a.count);
    }
    // Clear old query cache entries
    static cleanupQueryCache(maxAge = 24 * 60 * 60 * 1000) {
        const now = Date.now();
        this.queryCache.forEach((value, key) => {
            if (now - value.timestamp > maxAge) {
                this.queryCache.delete(key);
            }
        });
    }
    static getQueryKey(query) {
        // Create a simplified key for the query
        return query.replace(/\s+/g, ' ').trim().substring(0, 100);
    }
}
QueryOptimizer.queryCache = new Map();
// Database connection pool optimization
export class ConnectionOptimizer {
    static trackConnection(operation) {
        switch (operation) {
            case 'acquire':
                this.connectionStats.active++;
                this.connectionStats.total++;
                break;
            case 'release':
                this.connectionStats.active--;
                this.connectionStats.idle++;
                break;
            case 'error':
                this.connectionStats.errors++;
                break;
        }
        // Log connection pool status
        if (this.connectionStats.active > 10) { // Alert if too many active connections
            LoggerService.warn('High connection pool usage', this.connectionStats);
        }
    }
    static getConnectionStats() {
        return { ...this.connectionStats };
    }
}
ConnectionOptimizer.connectionStats = {
    active: 0,
    idle: 0,
    total: 0,
    errors: 0
};
// Query result caching with intelligent invalidation
export class ResultCache {
    static set(key, data, dependencies = []) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            dependencies
        });
    }
    static get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        // Check if cache is still valid (5 minutes TTL)
        if (Date.now() - entry.timestamp > 5 * 60 * 1000) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    static invalidateByDependency(dependency) {
        this.cache.forEach((entry, key) => {
            if (entry.dependencies.includes(dependency)) {
                this.cache.delete(key);
            }
        });
    }
    static clear() {
        this.cache.clear();
    }
}
ResultCache.cache = new Map();
// Scheduled cleanup
setInterval(() => {
    QueryOptimizer.cleanupQueryCache();
}, 60 * 60 * 1000); // Clean up every hour
export default QueryOptimizer;
