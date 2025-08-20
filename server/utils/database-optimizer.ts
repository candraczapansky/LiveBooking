import { db } from '../db';
import { sql } from 'drizzle-orm';
import { ProductionLogger } from './production-logger';

// Cache interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Simple in-memory cache (in production, use Redis)
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 1000; // Maximum cache entries

  set<T>(key: string, data: T, ttl: number = 300000): void { // 5 minutes default
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Database performance monitor
class DatabasePerformanceMonitor {
  private queryTimes: Map<string, number[]> = new Map();
  private slowQueryThreshold = 1000; // 1 second

  recordQuery(query: string, duration: number): void {
    if (!this.queryTimes.has(query)) {
      this.queryTimes.set(query, []);
    }

    const times = this.queryTimes.get(query)!;
    times.push(duration);

    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      ProductionLogger.warn('Slow query detected', {
        query: query.substring(0, 200) + '...',
        duration,
        threshold: this.slowQueryThreshold,
      });
    }
  }

  getQueryStats(query: string): { avg: number; min: number; max: number; count: number } | null {
    const times = this.queryTimes.get(query);
    if (!times || times.length === 0) return null;

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    return { avg, min, max, count: times.length };
  }

  getSlowQueries(): Array<{ query: string; avg: number; count: number }> {
    const slowQueries: Array<{ query: string; avg: number; count: number }> = [];

    for (const [query, times] of this.queryTimes.entries()) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      if (avg > this.slowQueryThreshold) {
        slowQueries.push({
          query: query.substring(0, 200) + '...',
          avg,
          count: times.length,
        });
      }
    }

    return slowQueries.sort((a, b) => b.avg - a.avg);
  }
}

// Database optimizer
export class DatabaseOptimizer {
  private cache = new MemoryCache();
  private monitor = new DatabasePerformanceMonitor();

  // Cache wrapper for database queries
  async cachedQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl: number = 300000 // 5 minutes
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.cache.get<T>(key);
    if (cached) {
      ProductionLogger.debug('Cache hit', { key });
      return cached;
    }

    // Execute query and cache result
    const start = Date.now();
    try {
      const result = await queryFn();
      const duration = Date.now() - start;

      // Cache the result
      this.cache.set(key, result, ttl);

      // Record performance
      this.monitor.recordQuery(key, duration);

      ProductionLogger.debug('Cache miss', { key, duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      ProductionLogger.error('Database query failed', { key, duration, error: error.message });
      throw error;
    }
  }

  // Invalidate cache entries by pattern
  invalidateCache(pattern: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache['cache'].keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    ProductionLogger.info('Cache invalidated', { pattern, count: keysToDelete.length });
  }

  // Generate cache key from parameters
  generateCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `${prefix}:${sortedParams}`;
  }

  // Optimized query for sales by category
  async getSalesByCategory(startDate: Date, endDate: Date, userId?: number, role?: string): Promise<any[]> {
    const cacheKey = this.generateCacheKey('sales_by_category', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      userId,
      role,
    });

    return this.cachedQuery(cacheKey, async () => {
      const start = Date.now();
      
      let query;
      if (role === 'staff' && userId) {
        query = sql`
          WITH sales_by_category AS (
            SELECT 
              sc.name as category_name,
              'service' as transaction_type,
              COALESCE(SUM(a.total_amount), 0) as total_revenue,
              COUNT(a.id) as transaction_count
            FROM sales_history sh
            JOIN appointments a ON sh.appointment_id = a.id
            JOIN services s ON a.service_id = s.id
            JOIN service_categories sc ON s.category_id = sc.id
            WHERE sh.transaction_type = 'appointment'
              AND sh.payment_status = 'completed'
              AND sh.transaction_date >= ${startDate}
              AND sh.transaction_date <= ${endDate}
              AND a.staff_id = ${userId}
            GROUP BY sc.id, sc.name
          )
          SELECT 
            category_name,
            SUM(total_revenue) as total_revenue,
            SUM(transaction_count) as transaction_count,
            ROUND(
              (SUM(total_revenue) / SUM(SUM(total_revenue)) OVER()) * 100, 2
            ) as percentage
          FROM sales_by_category
          GROUP BY category_name
          ORDER BY total_revenue DESC
        `;
      } else {
        query = sql`
          WITH sales_by_category AS (
            SELECT 
              sc.name as category_name,
              'service' as transaction_type,
              COALESCE(SUM(a.total_amount), 0) as total_revenue,
              COUNT(a.id) as transaction_count
            FROM sales_history sh
            JOIN appointments a ON sh.appointment_id = a.id
            JOIN services s ON a.service_id = s.id
            JOIN service_categories sc ON s.category_id = sc.id
            WHERE sh.transaction_type = 'appointment'
              AND sh.payment_status = 'completed'
              AND sh.transaction_date >= ${startDate}
              AND sh.transaction_date <= ${endDate}
            GROUP BY sc.id, sc.name
            
            UNION ALL
            
            SELECT 
              p.category as category_name,
              'product' as transaction_type,
              COALESCE(SUM(sh.total_amount), 0) as total_revenue,
              COUNT(sh.id) as transaction_count
            FROM sales_history sh
            JOIN products p ON p.id = ANY(
              SELECT jsonb_array_elements_text(sh.product_ids::jsonb)::integer
            )
            WHERE sh.transaction_type = 'pos_sale'
              AND sh.payment_status = 'completed'
              AND sh.transaction_date >= ${startDate}
              AND sh.transaction_date <= ${endDate}
            GROUP BY p.category
          )
          SELECT 
            category_name,
            SUM(total_revenue) as total_revenue,
            SUM(transaction_count) as transaction_count,
            ROUND(
              (SUM(total_revenue) / SUM(SUM(total_revenue)) OVER()) * 100, 2
            ) as percentage
          FROM sales_by_category
          GROUP BY category_name
          ORDER BY total_revenue DESC
        `;
      }

      const result = await db.execute(query);
      const duration = Date.now() - start;
      
      ProductionLogger.logDatabaseOperation('SELECT', 'sales_by_category', duration, true);
      
      return result.rows;
    }, 180000); // 3 minutes cache for sales data
  }

  // Optimized query for client retention
  async getClientRetention(startDate: Date, endDate: Date, userId?: number, role?: string): Promise<any> {
    const cacheKey = this.generateCacheKey('client_retention', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      userId,
      role,
    });

    return this.cachedQuery(cacheKey, async () => {
      const start = Date.now();
      const previousPeriodStart = new Date(startDate.getTime() - (30 * 24 * 60 * 60 * 1000));

      let query;
      if (role === 'staff' && userId) {
        query = sql`
          WITH client_periods AS (
            SELECT DISTINCT 
              client_id,
              'previous' as period
            FROM appointments 
            WHERE start_time >= ${previousPeriodStart}
              AND start_time < ${startDate}
              AND status = 'completed'
              AND staff_id = ${userId}
            
            UNION ALL
            
            SELECT DISTINCT 
              client_id,
              'current' as period
            FROM appointments 
            WHERE start_time >= ${startDate}
              AND start_time <= ${endDate}
              AND status = 'completed'
              AND staff_id = ${userId}
          ),
          retention_analysis AS (
            SELECT 
              client_id,
              COUNT(CASE WHEN period = 'previous' THEN 1 END) as was_previous_client,
              COUNT(CASE WHEN period = 'current' THEN 1 END) as is_current_client
            FROM client_periods
            GROUP BY client_id
          )
          SELECT 
            COUNT(CASE WHEN was_previous_client > 0 AND is_current_client > 0 THEN 1 END) as retained_clients,
            COUNT(CASE WHEN was_previous_client > 0 THEN 1 END) as total_previous_clients,
            COUNT(CASE WHEN is_current_client > 0 THEN 1 END) as total_current_clients,
            ROUND(
              (COUNT(CASE WHEN was_previous_client > 0 AND is_current_client > 0 THEN 1 END)::decimal / 
               NULLIF(COUNT(CASE WHEN was_previous_client > 0 THEN 1 END), 0)) * 100, 2
            ) as retention_rate
          FROM retention_analysis
        `;
      } else {
        query = sql`
          WITH client_periods AS (
            SELECT DISTINCT 
              client_id,
              'previous' as period
            FROM appointments 
            WHERE start_time >= ${previousPeriodStart}
              AND start_time < ${startDate}
              AND status = 'completed'
            
            UNION ALL
            
            SELECT DISTINCT 
              client_id,
              'current' as period
            FROM appointments 
            WHERE start_time >= ${startDate}
              AND start_time <= ${endDate}
              AND status = 'completed'
          ),
          retention_analysis AS (
            SELECT 
              client_id,
              COUNT(CASE WHEN period = 'previous' THEN 1 END) as was_previous_client,
              COUNT(CASE WHEN period = 'current' THEN 1 END) as is_current_client
            FROM client_periods
            GROUP BY client_id
          )
          SELECT 
            COUNT(CASE WHEN was_previous_client > 0 AND is_current_client > 0 THEN 1 END) as retained_clients,
            COUNT(CASE WHEN was_previous_client > 0 THEN 1 END) as total_previous_clients,
            COUNT(CASE WHEN is_current_client > 0 THEN 1 END) as total_current_clients,
            ROUND(
              (COUNT(CASE WHEN was_previous_client > 0 AND is_current_client > 0 THEN 1 END)::decimal / 
               NULLIF(COUNT(CASE WHEN was_previous_client > 0 THEN 1 END), 0)) * 100, 2
            ) as retention_rate
          FROM retention_analysis
        `;
      }

      const result = await db.execute(query);
      const duration = Date.now() - start;
      
      ProductionLogger.logDatabaseOperation('SELECT', 'client_retention', duration, true);
      
      return result.rows[0] || {
        retained_clients: 0,
        total_previous_clients: 0,
        total_current_clients: 0,
        retention_rate: 0,
      };
    }, 300000); // 5 minutes cache for retention data
  }

  // Get database performance statistics
  getPerformanceStats(): any {
    const slowQueries = this.monitor.getSlowQueries();
    const cacheStats = {
      size: this.cache.size(),
      hitRate: 0, // Would need to track hits/misses
    };

    return {
      slowQueries,
      cacheStats,
      memoryUsage: process.memoryUsage(),
    };
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    ProductionLogger.info('Database cache cleared');
  }

  // Get cache statistics
  getCacheStats(): any {
    return {
      size: this.cache.size(),
      // Add more cache statistics as needed
    };
  }
}

// Database indexes creation (run this in production)
export async function createDatabaseIndexes(): Promise<void> {
  try {
    // Create indexes for better query performance
    const indexes = [
      // Sales history indexes
      'CREATE INDEX IF NOT EXISTS idx_sales_history_transaction_date ON sales_history(transaction_date)',
      'CREATE INDEX IF NOT EXISTS idx_sales_history_payment_status ON sales_history(payment_status)',
      'CREATE INDEX IF NOT EXISTS idx_sales_history_staff_id ON sales_history(staff_id)',
      
      // Appointments indexes
      'CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time)',
      'CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)',
      'CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON appointments(staff_id)',
      'CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id)',
      
      // Users indexes
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      
      // Services indexes
      'CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id)',
      
      // Products indexes
      'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)',
    ];

    for (const indexQuery of indexes) {
      await db.execute(sql.raw(indexQuery));
    }

    ProductionLogger.info('Database indexes created successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ProductionLogger.error('Failed to create database indexes', { error: message });
    throw error;
  }
}

// Database connection pool monitoring
export function monitorDatabaseConnection(): void {
  setInterval(() => {
    // Monitor database connection health
    db.execute(sql`SELECT 1`)
      .then(() => {
        ProductionLogger.logDatabaseConnection('connected');
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        ProductionLogger.logDatabaseConnection('error', { error: message });
      });
  }, 60000); // Check every minute
}

export default DatabaseOptimizer; 