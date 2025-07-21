import { eq, and, or, inArray, desc, asc, gte, lte, like, ilike } from 'drizzle-orm';
import type { IStorage } from '../storage';
import LoggerService from './logger';

// Query optimization utilities
export class QueryOptimizer {
  private static queryCache = new Map<string, { query: string; timestamp: number; count: number }>();

  // Optimize pagination queries
  static optimizePagination(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;
    return { limit, offset };
  }

  // Optimize date range queries
  static optimizeDateRange(startDate?: string | Date, endDate?: string | Date) {
    if (!startDate && !endDate) return null;

    const conditions: any[] = [];
    
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
  static optimizeSearch(searchTerm?: string, searchFields: string[] = []) {
    if (!searchTerm || searchFields.length === 0) return null;

    const searchConditions = searchFields.map(field => 
      ilike(field as any, `%${searchTerm}%`)
    );

    return searchConditions.length > 0 ? or(...searchConditions) : null;
  }

  // Optimize sorting
  static optimizeSorting(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    if (!sortBy) return null;
    
    return sortOrder === 'asc' ? asc(sortBy as any) : desc(sortBy as any);
  }

  // Optimize filtering
  static optimizeFiltering(filters: Record<string, any>) {
    const conditions = [];

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          conditions.push(inArray(key as any, value));
        } else {
          conditions.push(eq(key as any, value));
        }
      }
    }

    return conditions.length > 0 ? and(...conditions) : null;
  }

  // Query performance monitoring
  static logQueryPerformance(query: string, startTime: number, context?: any) {
    const duration = Date.now() - startTime;
    const queryKey = this.getQueryKey(query);
    
    // Track query frequency
    const existing = this.queryCache.get(queryKey);
    if (existing) {
      existing.count++;
      existing.timestamp = Date.now();
    } else {
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
  static cleanupQueryCache(maxAge: number = 24 * 60 * 60 * 1000) { // 24 hours
    const now = Date.now();
    this.queryCache.forEach((value, key) => {
      if (now - value.timestamp > maxAge) {
        this.queryCache.delete(key);
      }
    });
  }

  private static getQueryKey(query: string): string {
    // Create a simplified key for the query
    return query.replace(/\s+/g, ' ').trim().substring(0, 100);
  }
}

// Database connection pool optimization
export class ConnectionOptimizer {
  private static connectionStats = {
    active: 0,
    idle: 0,
    total: 0,
    errors: 0
  };

  static trackConnection(operation: 'acquire' | 'release' | 'error') {
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

// Query result caching with intelligent invalidation
export class ResultCache {
  private static cache = new Map<string, { data: any; timestamp: number; dependencies: string[] }>();

  static set(key: string, data: any, dependencies: string[] = []) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      dependencies
    });
  }

  static get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if cache is still valid (5 minutes TTL)
    if (Date.now() - entry.timestamp > 5 * 60 * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  static invalidateByDependency(dependency: string) {
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

// Scheduled cleanup
setInterval(() => {
  QueryOptimizer.cleanupQueryCache();
}, 60 * 60 * 1000); // Clean up every hour

export default QueryOptimizer; 